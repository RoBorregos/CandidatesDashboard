import { z } from "zod";
import {
  createUploadthing,
  UTFiles,
  type FileRouter,
} from "uploadthing/next";
import { getServerAuthSession } from "./auth";
import { db } from "./db";
import {
  appendCommentToFile,
  bustListAllFilesCache,
  folderUserName,
  isFinalWeek,
  MAX_WEEK_BYTES,
  recordTeamUpload,
  stripFolderPrefix,
  teamUploadFolderPath,
  uploadWeekSchema,
  userUploadFolderPath,
  weekUsageBytes,
} from "~/server/api/routers/upload";
import {
  ADVANCED_CLOSED_MESSAGE,
  advancedDueAt,
  advancedFolderPath,
  findAdvancedMember,
  recordAdvancedFile,
  type AdvancedFileKind,
} from "~/server/api/routers/advanced-submission";

const f = createUploadthing();
const COMMENTS_FILE = "COMMENTS.md";

/*
 * Advanced candidates hand in one bitácora and one demo video. Both routes
 * share this: only an advanced registrant may upload, and the object is
 * renamed into their `Avanzados/{user}/{kind}/` folder.
 */
function advancedUploader(kind: AdvancedFileKind) {
  return async ({ files }: { files: readonly { name: string }[] }) => {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const member = await findAdvancedMember(db, session.user.email);
    if (!member) {
      throw new Error("Solo los candidatos avanzados pueden hacer esta entrega");
    }
    if (Date.now() > (await advancedDueAt(db)).getTime()) {
      throw new Error(ADVANCED_CLOSED_MESSAGE);
    }

    const userName = folderUserName(member.name, session.user.id);
    return {
      registrationMemberId: member.id,
      originalName: files[0]?.name ?? kind,
      [UTFiles]: files.map((file) => ({
        ...file,
        name: advancedFolderPath(userName, kind, file.name),
      })),
    };
  };
}

export const ourFileRouter = {
  teamUploader: f({
    blob: { maxFileSize: "256MB", maxFileCount: 30 },
  })
    .input(
      z.object({
        week: uploadWeekSchema,
        comment: z.string().min(1).max(2045).optional(),
      }),
    )
    .middleware(async ({ files, input }) => {
      const session = await getServerAuthSession();
      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { teamId: true },
      });
      if (!user?.teamId) {
        throw new Error("User isn't in a team");
      }

      const team = await db.team.findUnique({
        where: { id: user.teamId },
        select: { name: true },
      });
      if (!team) {
        throw new Error("Team not found");
      }

      // COMMENTS.md is managed server-side only (appendCommentToFile); block
      // candidates from uploading it directly to bypass the character limit.
      const hasCommentsFile = files.some(
        (f) => f.name.toUpperCase() === COMMENTS_FILE.toUpperCase(),
      );
      if (hasCommentsFile) {
        throw new Error(`No se permite subir ${COMMENTS_FILE} directamente`);
      }

      // The week's folder is capped at 256 MB total (not per file): reject the
      // upload up front if adding these files would exceed the allowance. For
      // individual weeks the cap is per user; for FINAL it is per team.
      const userId = session.user.id;
      const userName = folderUserName(session.user.name, userId);
      const existingUsage = await weekUsageBytes(
        db,
        user.teamId,
        input.week,
        isFinalWeek(input.week) ? null : userId,
      );
      const incomingBytes = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
      if (existingUsage + incomingBytes > MAX_WEEK_BYTES) {
        throw new Error("La semana excedería el límite de 256 MB");
      }

      // Rename each object to `{Semana-[1-5]}/{team}/{user}/{file}` for
      // individual weeks and `FINAL/{team}/{file}` for the final, so
      // UploadThing shows the file inside its per-user / team folder. We
      // deliberately do NOT set a customId: a repeated customId is what makes
      // UploadThing reject the upload with a "file already exists" 409.
      return {
        teamId: user.teamId,
        teamName: team.name,
        week: input.week,
        comment: input.comment,
        userId,
        userName,
        [UTFiles]: files.map((file) => ({
          ...file,
          name: isFinalWeek(input.week)
            ? teamUploadFolderPath(team.name, input.week, file.name)
            : userUploadFolderPath(team.name, input.week, userName, file.name),
        })),
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // The object name carries the folder prefix; store the plain file name.
      const name = stripFolderPrefix(
        metadata.teamName,
        metadata.week,
        metadata.userName,
        file.name,
      );
      const record = await recordTeamUpload({
        teamId: metadata.teamId,
        week: metadata.week,
        name,
        fileKey: file.key,
        customId: isFinalWeek(metadata.week)
          ? teamUploadFolderPath(metadata.teamName, metadata.week, name)
          : userUploadFolderPath(
              metadata.teamName,
              metadata.week,
              metadata.userName,
              name,
            ),
        fileUrl: file.ufsUrl,
        fileSize: file.size,
        fileType: file.type,
        userId: isFinalWeek(metadata.week) ? null : metadata.userId,
      });

      // Bust the listAllFiles cache so reconcileWithStorage sees the new file.
      bustListAllFilesCache();

      // A comment submitted together with files is accumulated into the same
      // COMMENTS.md (per user for individual weeks, shared for FINAL) so it
      // doesn't require a second request.
      if (metadata.comment) {
        await appendCommentToFile({
          db,
          teamId: metadata.teamId,
          teamName: metadata.teamName,
          week: metadata.week,
          text: metadata.comment,
          userId: isFinalWeek(metadata.week) ? null : metadata.userId,
          userName: metadata.userName,
        });
      }

      return {
        id: record.id,
        name: record.name,
        fileUrl: record.fileUrl,
      };
    }),

  advancedBitacora: f({
    blob: { maxFileSize: "32MB", maxFileCount: 1 },
  })
    .middleware(advancedUploader("bitacora"))
    .onUploadComplete(async ({ metadata, file }) => {
      await recordAdvancedFile(db, {
        registrationMemberId: metadata.registrationMemberId,
        kind: "bitacora",
        key: file.key,
        name: metadata.originalName,
        url: file.ufsUrl,
        size: file.size,
      });
      return { url: file.ufsUrl };
    }),

  advancedVideo: f({
    video: { maxFileSize: "256MB", maxFileCount: 1 },
  })
    .middleware(advancedUploader("video"))
    .onUploadComplete(async ({ metadata, file }) => {
      await recordAdvancedFile(db, {
        registrationMemberId: metadata.registrationMemberId,
        kind: "video",
        key: file.key,
        name: metadata.originalName,
        url: file.ufsUrl,
        size: file.size,
      });
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
