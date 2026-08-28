import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UTApi } from "uploadthing/server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";

/**
 * Upload microservice.
 *
 * Handles uploads organized in folders on UploadThing with the shape:
 *   {Semana-[1-5]}/{teamName}/{userName}/{file}  -- individual weeks
 *   FINAL/{teamName}/{file}                        -- final submission, team-wide
 * and persists every upload (and its folder path) in the database via Prisma.
 *
 * Weeks 1-5 are private to the user who uploaded them: only the owner sees
 * their own folder. The FINAL week is shared by the whole team.
 */

export const MAX_UPLOAD_WEEK = 7;
export const MIN_UPLOAD_WEEK = 1;
export const MAX_INDIVIDUAL_WEEK = 5;
// The reserved week number for the final submission ("FINAL" in the UI).
export const FINAL_WEEK = 7;

// Weekly comments are accumulated into a single COMMENTS.md. A single comment
// (the "diff") is capped at MAX_COMMENT_CHARS characters and MAX_COMMENT_BYTES
// bytes, and every comment is terminated by \x04 so messages can be fragmented
// when read back.
export const COMMENTS_FILE = "COMMENTS.md";
export const MAX_COMMENT_CHARS = 2045;
export const MAX_COMMENT_BYTES = 2048;

// A week's folder may hold up to 256 MB in total (across all files), not a
// per-file cap. Used to block uploads that would exceed the weekly allowance
// and to show usage in the UI.
export const MAX_WEEK_BYTES = 256 * 1024 * 1024;

export const uploadWeekSchema = z.number().int().min(MIN_UPLOAD_WEEK).max(MAX_UPLOAD_WEEK);

const utapi = new UTApi();

/**
 * Clean a path segment so it is safe to use inside a customId:
 * spaces become dashes and non-word characters are dropped.
 */
function sanitizeSegment(value: string): string {
  return value
    .normalize("NFKD")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w.[\]()+-]/g, "");
}

/** First path segment for a week: "Semana-1"…"Semana-5" or "FINAL" for the final week. */
export function weekSegment(week: number): string {
  return week === FINAL_WEEK ? "FINAL" : `Semana-${week}`;
}

/** True when a week is the shared team-level FINAL submission. */
export function isFinalWeek(week: number): boolean {
  return week === FINAL_WEEK;
}

/**
 * Build the folder prefix `{Semana-[1-5]|FINAL}/{teamName}` that every object
 * of a week lives under. The user segment is only included for individual
 * weeks, where each member gets their own private subfolder.
 */
function folderPrefix(
  teamName: string,
  week: number,
  userName?: string | null,
): string {
  const team = sanitizeSegment(teamName);
  const user = userName != null ? `/${sanitizeSegment(userName)}` : "";
  return `${weekSegment(week)}/${team}${user}`;
}

/**
 * Build the folder path for a team-wide week (the FINAL submission):
 * `FINAL/{teamName}/{fileName}`. Used to display and to locate older uploads
 * of the same file.
 */
export function teamUploadFolderPath(
  teamName: string,
  week: number,
  fileName: string,
): string {
  return `${folderPrefix(teamName, week)}/${sanitizeSegment(fileName)}`;
}

/**
 * Build the folder path for a user's private week (weeks 1-5):
 * `{Semana-[1-5]}/{teamName}/{userName}/{fileName}`. Used to display and to
 * locate older uploads of the same file.
 */
export function userUploadFolderPath(
  teamName: string,
  week: number,
  userName: string,
  fileName: string,
): string {
  return `${folderPrefix(teamName, week, userName)}/${sanitizeSegment(fileName)}`;
}

/**
 * Deterministic "base" a file name maps to inside its folder. Used to locate
 * an existing file regardless of which revision is stored (only legacy files
 * with a customId can match here).
 */
function folderBase(
  teamName: string,
  week: number,
  userName: string | null,
  fileName: string,
): string {
  const safe = sanitizeSegment(fileName);
  const dot = safe.lastIndexOf(".");
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  return `${folderPrefix(teamName, week, userName)}/${base}`;
}

/**
 * Strip the folder prefix a renamed object carries
 * (`{Semana-[1-5]}/{team}/{user}/` or `FINAL/{team}/`) and return the original
 * file name. Kept deterministic so the object name on UploadThing is exactly
 * the folder path + file name.
 */
export function stripFolderPrefix(
  teamName: string,
  week: number,
  userName: string | null,
  fullName: string,
): string {
  const prefix = `${folderPrefix(teamName, week, userName)}/`;
  return fullName.startsWith(prefix) ? fullName.slice(prefix.length) : fullName;
}

/**
 * Does a stored customId belong to the same team/week + base file name?
 * (Only legacy files carried a customId; new uploads are renamed instead.)
 */

/** Does a stored customId belong to the same team/week + base file name? */
function keyMatchesBase(customId: string, base: string): boolean {
  return (
    customId === base ||
    customId.startsWith(`${base}-`) ||
    customId.startsWith(`${base}.`) ||
    customId.startsWith(`${base}]`) ||
    customId.startsWith(`${base}(`) ||
    customId.startsWith(`${base}+`)
  );
}

/** List every file currently stored on UploadThing (paginated). */
async function listAllFiles() {
  const files: { key: string; customId: string }[] = [];
  let offset = 0;
  for (;;) {
    const page = await utapi.listFiles({ limit: 1000, offset });
    for (const file of page.files ?? []) {
      // Keep every key even when customId is missing: new uploads deliberately
      // carry no UploadThing customId, so matching must fall back to fileKey.
      files.push({ key: file.key, customId: file.customId ?? "" });
    }
    if (!page.hasMore) break;
    offset = files.length;
  }
  return files;
}

/**
 * Reconcile DB upload records against what actually exists on UploadThing.
 *
 * Files can be deleted directly from the UploadThing dashboard, which leaves
 * a stale `TeamUpload` row behind: the UI would still show a link that 404s
 * when clicked. Here we build the set of keys/customIds still present on
 * UploadThing and drop any DB record that no longer has a backing file, so
 * the displayed list always matches reality.
 */
async function reconcileWithStorage<
  T extends { id: string; fileKey: string; customId: string },
>(records: T[]): Promise<T[]> {
  if (records.length === 0) return records;

  const stored = await listAllFiles();
  const liveKeys = new Set(stored.map((f) => f.key));
  const liveCustomIds = new Set(
    stored.filter((f) => f.customId).map((f) => f.customId),
  );

  const alive = records.filter(
    (r) => liveKeys.has(r.fileKey) || liveCustomIds.has(r.customId),
  );
  const stale = records.filter(
    (r) => !liveKeys.has(r.fileKey) && !liveCustomIds.has(r.customId),
  );

  if (stale.length > 0) {
    await db.teamUpload
      .deleteMany({ where: { id: { in: stale.map((s) => s.id) } } })
      .catch(() => undefined);
  }

  return alive;
}

/**
 * Remove any UploadThing file that already occupies the folder being written.
 * This is what makes uploading "replace" instead of colliding with the HTTP
 * 409 "file already exists" error whenever a previous upload of the same file
 * is still registered on UploadThing.
 *
 * Returns what was freed so callers can inform the UI.
 */
export async function clearFolderConflicts(
  teamName: string,
  week: number,
  fileNames: string[],
  userName: string | null,
): Promise<{ freedKeys: string[]; conflicts: { fileName: string; customId: string }[] }> {
  const bases = fileNames.map((fileName) => ({
    fileName,
    base: folderBase(teamName, week, userName, fileName),
  }));

  const all = await listAllFiles();
  const freedKeys: string[] = [];
  const conflicts: { fileName: string; customId: string }[] = [];

  for (const entry of bases) {
    const hit = all.find((f) => keyMatchesBase(f.customId, entry.base));
    if (hit) {
      freedKeys.push(hit.key);
      conflicts.push({ fileName: entry.fileName, customId: hit.customId });
    }
  }

  if (freedKeys.length > 0) {
    await utapi.deleteFiles(freedKeys).catch(() => undefined);
  }

  return { freedKeys, conflicts };
}

export type TeamUploadRecord = {
  teamId: string;
  week: number;
  name: string;
  fileKey: string;
  customId: string;
  fileUrl: string;
  fileSize: number | null;
  fileType: string | null;
  // Owner for individual weeks; null for the team-wide FINAL week.
  userId: string | null;
};

/**
 * Persist an upload record. Because the object name is deterministic
 * (`{Semana-[1-5]}/{team}/{user}/{filename}` for individual weeks,
 * `FINAL/{team}/{filename}` for the final), re-uploading a file replaces the
 * previous record: the older DB row and storage file are freed here.
 */
export async function recordTeamUpload(input: TeamUploadRecord) {
  const older = await db.teamUpload.findMany({
    where: {
      teamId: input.teamId,
      week: input.week,
      name: input.name,
      // For individual weeks only the owner's previous record can be replaced.
      ...(isFinalWeek(input.week) ? {} : { userId: input.userId }),
    },
    select: { id: true, fileKey: true },
  });

  const staleKeys = older
    .map((row) => row.fileKey)
    .filter((key) => key !== input.fileKey);
  if (staleKeys.length > 0) {
    await utapi.deleteFiles(staleKeys).catch(() => undefined);
  }
  if (older.length > 0) {
    await db.teamUpload.deleteMany({
      where: { id: { in: older.map((row) => row.id) } },
    });
  }

  return db.teamUpload.create({ data: input });
}

/** Resolve the caller's team, falling back to a DB lookup when the session lags behind. */
async function currentTeamId(ctx: {
  db: typeof db;
  session: { user: { id: string; teamId: string | null } };
}) {
  if (ctx.session.user.teamId) return ctx.session.user.teamId;

  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { teamId: true },
  });
  return user?.teamId ?? null;
}

/** Total bytes currently stored for a week's folder (excludes COMMENTS.md). */
export async function weekUsageBytes(
  client: typeof db,
  teamId: string,
  week: number,
  userId: string | null,
): Promise<number> {
  const rows = await client.teamUpload.findMany({
    where: {
      teamId,
      week,
      NOT: { name: COMMENTS_FILE },
      // Individual weeks bill only the user's own subfolder; the FINAL week
      // counts the whole shared folder.
      ...(isFinalWeek(week) ? {} : { userId }),
    },
    select: { fileSize: true },
  });
  return rows.reduce((sum, row) => sum + (row.fileSize ?? 0), 0);
}

/**
 * Resolve the folder segment for a user's private week folder. Falls back to
 * the user id when the profile has no display name so every user still gets an
 * isolated, deterministic subfolder.
 */
export function folderUserName(
  userName: string | null | undefined,
  userId: string,
): string {
  return userName != null && userName.trim().length > 0 ? userName : userId;
}

/**
 * Append a comment (a diff) to a user's/team's COMMENTS.md.
 *
 * Reads the current COMMENTS.md, appends the comment (terminated by \x04 and
 * separated by a linebreak), re-stores the file and replaces the DB record.
 * Enforces MAX_COMMENT_CHARS and MAX_COMMENT_BYTES. Shared by the
 * `submitComment` procedure and the file-upload path so a comment sent together
 * with files lands in the same COMMENTS.md.
 */
export async function appendCommentToFile(input: {
  db: typeof db;
  teamId: string;
  teamName: string;
  week: number;
  text: string;
  // A user's private week has its own COMMENTS.md inside the user folder;
  // the team-wide FINAL week shares a single COMMENTS.md (userId null).
  userId: string | null;
  // Concrete folder segment used for individual weeks (already resolved).
  userName: string;
}): Promise<void> {
  const { db, teamId, teamName, week, text, userId, userName } = input;

  if (text.length > MAX_COMMENT_CHARS) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: `El comentario excede ${MAX_COMMENT_CHARS} caracteres`,
    });
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > MAX_COMMENT_BYTES) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: `El comentario excede ${MAX_COMMENT_BYTES} bytes`,
    });
  }

  const existing = await db.teamUpload.findFirst({
    where: {
      teamId,
      week,
      name: COMMENTS_FILE,
      ...(isFinalWeek(week) ? {} : { userId }),
    },
  });

  let content = "";
  if (existing) {
    try {
      content = await (await fetch(existing.fileUrl)).text();
    } catch {
      content = "";
    }
  }

  // Idempotency guard: the comment appended to a batch is placed only once.
  // UploadThing runs `onUploadComplete` once per uploaded file, so without this
  // the same comment would be appended once per file. We detect this by checking
  // whether the most recent \x04-terminated segment is already this comment; if
  // so, a sibling file already wrote it and we skip re-writing it. This is
  // deterministic and safe across concurrent/duplicate onUploadComplete calls.
  const lastSegment = content
    .split("\x04")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .at(-1);
  if (lastSegment != null && lastSegment === text.trim()) {
    return;
  }

  const appended = content ? `${content}\n${text}\x04` : `${text}\x04`;

  const fileName = isFinalWeek(week)
    ? teamUploadFolderPath(teamName, week, COMMENTS_FILE)
    : userUploadFolderPath(teamName, week, userName, COMMENTS_FILE);
  const result = await utapi.uploadFiles([
    new File([appended], fileName, { type: "text/markdown" }),
  ]);
  const [uploaded] = result;
  if (!uploaded?.data) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No se pudo guardar el comentario",
    });
  }
  const file = uploaded.data;

  // Replace the previous COMMENTS.md record (and free its storage file).
  await recordTeamUpload({
    teamId,
    week,
    name: COMMENTS_FILE,
    fileKey: file.key,
    customId: fileName,
    fileUrl: file.ufsUrl,
    fileSize: file.size ?? null,
    fileType: "text/markdown",
    userId: isFinalWeek(week) ? null : userId,
  });
}

export const uploadRouter = createTRPCRouter({
  /** Every upload visible to the caller: their own individual weeks + the team-wide FINAL week. */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const teamId = await currentTeamId(ctx);
    if (!teamId) return [];
    const records = await ctx.db.teamUpload.findMany({
      where: {
        teamId,
        // Weeks 1-5 are private (only the owner's files), the FINAL week is shared.
        OR: [{ week: FINAL_WEEK }, { userId: ctx.session.user.id }],
      },
      orderBy: [{ week: "asc" }, { createdAt: "desc" }],
    });
    return reconcileWithStorage(records);
  }),

  /** Uploads visible to the caller for a single week (1-7). */
  getByWeek: protectedProcedure
    .input(z.object({ week: uploadWeekSchema }))
    .query(async ({ ctx, input }) => {
      const teamId = await currentTeamId(ctx);
      if (!teamId) return [];
      const records = await ctx.db.teamUpload.findMany({
        where: {
          teamId,
          week: input.week,
          // Individual weeks only surface the caller's own folder; the FINAL
          // week is shared by the whole team.
          ...(isFinalWeek(input.week) ? {} : { userId: ctx.session.user.id }),
        },
        orderBy: { createdAt: "desc" },
      });
      return reconcileWithStorage(records);
    }),

  /**
   * Pre-upload gate: the client calls this BEFORE uploading to verify that the
   * target folder paths on UploadThing are clear. Any file that already lives
   * in the caller's `{Semana-[1-5]}/{team}/{user}/*` (or `FINAL/{team}/*`) folder
   * with the same name is freed so the upload cannot collide with a 409. Also
   * serves as a manual reconciliation when the realtime list refresh fails for
   * another account.
   */
  prepareUpload: protectedProcedure
    .input(
      z.object({
        week: uploadWeekSchema,
        fileNames: z.array(z.string().min(1).max(255)).max(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const teamId = await currentTeamId(ctx);
      if (!teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Debes pertenecer a un equipo para subir archivos",
        });
      }

      const team = await ctx.db.team.findUnique({
        where: { id: teamId },
        select: { name: true },
      });
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró el equipo" });
      }

      const userName = isFinalWeek(input.week)
        ? null
        : folderUserName(ctx.session.user.name, ctx.session.user.id);
      const { freedKeys, conflicts } = await clearFolderConflicts(
        team.name,
        input.week,
        input.fileNames,
        userName,
      );

      return {
        ready: true,
        freed: freedKeys.length,
        conflicts,
        teamName: team.name,
      };
    }),

  /**
   * Append a weekly comment (a diff) to the caller's COMMENTS.md.
   *
   * The client only sends the new comment text; the server takes care of
   * reading the current COMMENTS.md, appending the comment, and re-storing the
   * file. This keeps every comment (terminated by \x04 and separated by a
   * linebreak) inside a single per-user COMMENTS.md for weeks 1-5 (and a
   * shared one for FINAL) without the client having to download and re-upload
   * the whole file. The input is capped at MAX_COMMENT_CHARS characters and
   * MAX_COMMENT_BYTES bytes.
   */
  submitComment: protectedProcedure
    .input(
      z.object({
        week: uploadWeekSchema,
        text: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const teamId = await currentTeamId(ctx);
      if (!teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Debes pertenecer a un equipo para comentar",
        });
      }

      const team = await ctx.db.team.findUnique({
        where: { id: teamId },
        select: { name: true },
      });
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró el equipo" });
      }

      const { text } = input;
      await appendCommentToFile({
        db: ctx.db,
        teamId,
        teamName: team.name,
        week: input.week,
        text,
        userId: isFinalWeek(input.week) ? null : ctx.session.user.id,
        userName: folderUserName(ctx.session.user.name, ctx.session.user.id),
      });

      return { saved: true };
    }),

  /** Delete an upload: removes the file from UploadThing and the record from the DB. */
  remove: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const teamId = await currentTeamId(ctx);
      if (!teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Debes pertenecer a un equipo para eliminar archivos",
        });
      }

      const upload = await ctx.db.teamUpload.findFirst({
        where: { id: input.id, teamId },
      });
      if (!upload) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "El archivo no existe",
        });
      }

      // Individual weeks are private: only the owner can remove their files.
      if (!isFinalWeek(upload.week) && upload.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No puedes eliminar archivos de otra persona",
        });
      }

      // Best-effort storage cleanup: even if UploadThing is briefly unable to
      // remove the blob (eventual consistency), the record must disappear so
      // the UI reflects reality. The next upload to the same folder frees the
      // leftover via `clearFolderConflicts`.
      await utapi.deleteFiles(upload.fileKey).catch(() => undefined);
      await ctx.db.teamUpload.delete({ where: { id: upload.id } });

      return { success: true };
    }),
});