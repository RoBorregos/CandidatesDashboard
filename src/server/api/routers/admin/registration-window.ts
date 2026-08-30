import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { RegistrationOverride } from "@prisma/client";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { DEFAULT_REGISTRATION_WINDOW } from "~/lib/registration";
import { type db as Db } from "~/server/db";

/**
 * These endpoints return the raw window fields rather than a resolved window,
 * so the panel can re-resolve them against a ticking clock and show a
 * deadline or a temporary reopen expiring live.
 */
const WINDOW_SELECT = {
  registrationClosesAt: true,
  registrationOverride: true,
  registrationOverrideUntil: true,
} as const;

const CONFIG_SELECT = { id: true, ...WINDOW_SELECT } as const;

/** Arbitrary but fixed: the lock two concurrent creators contend on. */
const CONFIG_LOCK_KEY = 4820_1126;

/** The Config row is a singleton that older installs may not have yet. */
async function getOrCreateConfig(db: typeof Db) {
  const existing = await db.config.findFirst({ select: CONFIG_SELECT });
  if (existing) return existing;

  // Nothing in the schema makes Config a singleton, so a bare find-then-create
  // lets two admins acting at once on a fresh install each insert a row. Reads
  // elsewhere use an unordered `findFirst`, so the duplicates would then be
  // written to and read from inconsistently — the panel would report the form
  // closed while the public page kept it open. Serialize the create instead.
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CONFIG_LOCK_KEY})`;

    const raced = await tx.config.findFirst({ select: CONFIG_SELECT });
    if (raced) return raced;

    return tx.config.create({
      data: {
        freeze: true,
        competitionStarted: false,
        currentRound: 1,
        roundsRevealed: 0,
      },
      select: CONFIG_SELECT,
    });
  });
}

export const registrationWindowRouter = createTRPCRouter({
  getRegistrationWindow: adminProcedure.query(async ({ ctx }) => {
    return (
      (await ctx.db.config.findFirst({ select: WINDOW_SELECT })) ??
      DEFAULT_REGISTRATION_WINDOW
    );
  }),

  /**
   * Sets (or clears, with null) the deadline. Also drops any override, since
   * an active one is exactly what would defeat the schedule being set.
   */
  scheduleRegistrationClose: adminProcedure
    .input(z.object({ closesAt: z.coerce.date().nullable() }))
    .mutation(async ({ ctx, input }) => {
      if (input.closesAt && input.closesAt <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Esa fecha ya pasó. Usa «Cerrar ahora» si quieres cerrar el registro de inmediato.",
        });
      }

      const config = await getOrCreateConfig(ctx.db);
      return ctx.db.config.update({
        where: { id: config.id },
        data: {
          registrationClosesAt: input.closesAt,
          registrationOverride: null,
          registrationOverrideUntil: null,
        },
        select: WINDOW_SELECT,
      });
    }),

  /** Reopens the form for a fixed number of minutes, deadline untouched. */
  openRegistrationTemporarily: adminProcedure
    .input(
      z.object({
        minutes: z
          .number()
          .int()
          .min(1)
          .max(24 * 60),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const config = await getOrCreateConfig(ctx.db);
      const until = new Date(Date.now() + input.minutes * 60_000);

      return ctx.db.config.update({
        where: { id: config.id },
        data: {
          registrationOverride: RegistrationOverride.OPEN,
          registrationOverrideUntil: until,
        },
        select: WINDOW_SELECT,
      });
    }),

  /** Shuts the form now, regardless of the deadline, until an admin lifts it. */
  closeRegistrationNow: adminProcedure.mutation(async ({ ctx }) => {
    const config = await getOrCreateConfig(ctx.db);
    return ctx.db.config.update({
      where: { id: config.id },
      data: {
        registrationOverride: RegistrationOverride.CLOSED,
        registrationOverrideUntil: null,
      },
      select: WINDOW_SELECT,
    });
  }),

  /** Drops the override so the deadline decides again. */
  followRegistrationSchedule: adminProcedure.mutation(async ({ ctx }) => {
    const config = await getOrCreateConfig(ctx.db);
    return ctx.db.config.update({
      where: { id: config.id },
      data: { registrationOverride: null, registrationOverrideUntil: null },
      select: WINDOW_SELECT,
    });
  }),
});
