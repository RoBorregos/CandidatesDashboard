import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UTApi } from "uploadthing/server";
import type { PrismaClient } from "@prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { CURRENT_EDITION, DEFAULT_ADVANCED_DUE_AT } from "~/lib/registration";
import { sanitizeSegment } from "./upload";

/**
 * Advanced-track submissions.
 *
 * Advanced candidates compete alone and are never placed on a Team, so they
 * can't use the weekly TeamUpload flow. Each one hands in a bitácora, a GitHub
 * link and a demo video, stored on their RegistrationMember row (matched by
 * email, the same way registration.getMine does it). Files live on UploadThing
 * under `Avanzados/{userName}/{Bitacora|Video}/{file}`.
 */

export const ADVANCED_FILE_KINDS = ["bitacora", "video"] as const;
export type AdvancedFileKind = (typeof ADVANCED_FILE_KINDS)[number];

const utapi = new UTApi();

/** The caller's advanced RegistrationMember for this edition, if any. */
export async function findAdvancedMember(
  db: PrismaClient,
  email: string | null | undefined,
) {
  if (!email) return null;
  return db.registrationMember.findFirst({
    where: {
      edition: CURRENT_EDITION,
      email: { equals: email, mode: "insensitive" },
      registration: { edition: CURRENT_EDITION, track: "ADVANCED" },
    },
    select: { id: true, name: true },
  });
}

/** The hand-in deadline: the admin-set one, else the default. */
export async function advancedDueAt(db: PrismaClient): Promise<Date> {
  const config = await db.config.findFirst({
    select: { advancedSubmissionDueAt: true },
  });
  return config?.advancedSubmissionDueAt ?? DEFAULT_ADVANCED_DUE_AT;
}

export const ADVANCED_CLOSED_MESSAGE =
  "La fecha límite de entrega ya pasó; ya no se pueden hacer cambios";

/**
 * Past the deadline the submission is frozen: no uploads, link changes or
 * deletes, so what the mentors see is what was handed in on time.
 */
export async function assertAdvancedOpen(db: PrismaClient) {
  if (Date.now() > (await advancedDueAt(db)).getTime()) {
    throw new TRPCError({ code: "FORBIDDEN", message: ADVANCED_CLOSED_MESSAGE });
  }
}

export function advancedFolderPath(
  userName: string,
  kind: AdvancedFileKind,
  fileName: string,
): string {
  const folder = kind === "bitacora" ? "Bitacora" : "Video";
  return `Avanzados/${sanitizeSegment(userName)}/${folder}/${sanitizeSegment(fileName)}`;
}

/**
 * Store a freshly uploaded bitácora or video on the candidate's submission,
 * freeing the file it replaces so each slot only ever holds one file.
 */
export async function recordAdvancedFile(
  db: PrismaClient,
  input: {
    registrationMemberId: string;
    kind: AdvancedFileKind;
    key: string;
    name: string;
    url: string;
    size: number | null;
  },
) {
  const existing = await db.advancedSubmission.findUnique({
    where: { registrationMemberId: input.registrationMemberId },
    select: { bitacoraKey: true, videoKey: true },
  });
  const previousKey =
    input.kind === "bitacora" ? existing?.bitacoraKey : existing?.videoKey;
  if (previousKey && previousKey !== input.key) {
    await utapi.deleteFiles(previousKey).catch(() => undefined);
  }

  const fields =
    input.kind === "bitacora"
      ? {
          bitacoraKey: input.key,
          bitacoraName: input.name,
          bitacoraUrl: input.url,
          bitacoraSize: input.size,
          bitacoraUploadedAt: new Date(),
        }
      : {
          videoKey: input.key,
          videoName: input.name,
          videoUrl: input.url,
          videoSize: input.size,
          videoUploadedAt: new Date(),
        };

  return db.advancedSubmission.upsert({
    where: { registrationMemberId: input.registrationMemberId },
    update: fields,
    create: { registrationMemberId: input.registrationMemberId, ...fields },
  });
}

async function requireAdvancedMember(
  db: PrismaClient,
  email: string | null | undefined,
) {
  const member = await findAdvancedMember(db, email);
  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo los candidatos avanzados pueden hacer esta entrega",
    });
  }
  return member;
}

export const advancedSubmissionRouter = createTRPCRouter({
  /** The current hand-in deadline, for candidates and mentors alike. */
  getDeadline: protectedProcedure.query(async ({ ctx }) => {
    return advancedDueAt(ctx.db);
  }),

  /** The caller's submission (null when nothing is handed in) and the deadline. */
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const dueAt = await advancedDueAt(ctx.db);
    const member = await findAdvancedMember(ctx.db, ctx.session.user.email);
    const submission = member
      ? await ctx.db.advancedSubmission.findUnique({
          where: { registrationMemberId: member.id },
        })
      : null;
    return { submission, dueAt };
  }),

  /** Set or clear (empty string) the GitHub link. */
  saveGithub: protectedProcedure
    .input(
      z.object({
        url: z.union([
          z.literal(""),
          z
            .string()
            .trim()
            .url("Escribe un enlace válido")
            .max(500)
            .refine((value) => /^https?:\/\//i.test(value), {
              message: "El enlace debe empezar con http:// o https://",
            }),
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdvancedMember(
        ctx.db,
        ctx.session.user.email,
      );
      await assertAdvancedOpen(ctx.db);
      const githubUrl = input.url === "" ? null : input.url;
      const githubUpdatedAt = githubUrl ? new Date() : null;
      return ctx.db.advancedSubmission.upsert({
        where: { registrationMemberId: member.id },
        update: { githubUrl, githubUpdatedAt },
        create: { registrationMemberId: member.id, githubUrl, githubUpdatedAt },
      });
    }),

  /** Remove the bitácora or the video from storage and the submission. */
  removeFile: protectedProcedure
    .input(z.object({ kind: z.enum(ADVANCED_FILE_KINDS) }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdvancedMember(
        ctx.db,
        ctx.session.user.email,
      );
      await assertAdvancedOpen(ctx.db);
      const submission = await ctx.db.advancedSubmission.findUnique({
        where: { registrationMemberId: member.id },
      });
      const key =
        input.kind === "bitacora"
          ? submission?.bitacoraKey
          : submission?.videoKey;
      if (!submission || !key) return { success: true };

      await utapi.deleteFiles(key).catch(() => undefined);
      await ctx.db.advancedSubmission.update({
        where: { id: submission.id },
        data:
          input.kind === "bitacora"
            ? {
                bitacoraKey: null,
                bitacoraName: null,
                bitacoraUrl: null,
                bitacoraSize: null,
                bitacoraUploadedAt: null,
              }
            : {
                videoKey: null,
                videoName: null,
                videoUrl: null,
                videoSize: null,
                videoUploadedAt: null,
              },
      });
      return { success: true };
    }),
});
