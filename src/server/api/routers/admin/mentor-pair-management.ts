import { z } from "zod";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { CURRENT_EDITION } from "~/lib/registration";
import { beginnerTeamIds } from "~/server/teams";

const MENTOR_SELECT = { id: true, name: true, email: true } as const;

export const mentorPairManagementRouter = createTRPCRouter({
  getPairs: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.mentorPair.findMany({
      where: { edition: CURRENT_EDITION },
      include: {
        mentorA: { select: MENTOR_SELECT },
        mentorB: { select: MENTOR_SELECT },
        teams: {
          include: { team: { select: { id: true, name: true } } },
        },
        conflicts: {
          select: {
            teamId: true,
            createdAt: true,
            team: { select: { name: true } },
            reportedBy: { select: MENTOR_SELECT },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  // Mentors not yet in a pair this edition — the pool for the "create pair" pickers.
  getUnpairedMentors: adminProcedure.query(async ({ ctx }) => {
    const pairs = await ctx.db.mentorPair.findMany({
      where: { edition: CURRENT_EDITION },
      select: { mentorAId: true, mentorBId: true },
    });

    const pairedIds = new Set(pairs.flatMap((p) => [p.mentorAId, p.mentorBId]));

    return ctx.db.user.findMany({
      where: { isMentor: true, id: { notIn: [...pairedIds] } },
      select: MENTOR_SELECT,
      orderBy: { name: "asc" },
    });
  }),

  createPair: adminProcedure
    .input(
      z.object({
        mentorAId: z.string(),
        mentorBId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.mentorAId === input.mentorBId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A pair needs two different mentors.",
        });
      }

      const mentors = await ctx.db.user.findMany({
        where: {
          id: { in: [input.mentorAId, input.mentorBId] },
          isMentor: true,
        },
        select: { id: true },
      });

      if (mentors.length !== 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Both users must have mentor access.",
        });
      }

      /*
       * The compound uniques on MentorPair only stop the same user reappearing
       * in the same slot (mentorA/mentorB) twice — they don't stop someone who
       * is mentorB in one pair from becoming mentorA in another. Check both
       * slots for both incoming ids before creating.
       */
      const conflict = await ctx.db.mentorPair.findFirst({
        where: {
          edition: CURRENT_EDITION,
          OR: [
            { mentorAId: { in: [input.mentorAId, input.mentorBId] } },
            { mentorBId: { in: [input.mentorAId, input.mentorBId] } },
          ],
        },
      });

      if (conflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "One of these mentors is already in a pair this edition.",
        });
      }

      try {
        return await ctx.db.mentorPair.create({
          data: {
            edition: CURRENT_EDITION,
            mentorAId: input.mentorAId,
            mentorBId: input.mentorBId,
          },
          include: {
            mentorA: { select: MENTOR_SELECT },
            mentorB: { select: MENTOR_SELECT },
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "One of these mentors is already in a pair this edition.",
          });
        }

        throw error;
      }
    }),

  dissolvePair: adminProcedure
    .input(z.object({ pairId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.mentorPair.delete({ where: { id: input.pairId } });
      return { success: true };
    }),

  // Pure computation, no writes — teams get the pair at input.steps[i].teamId/pairId
  // in round-robin order so a pair can cover more than one team when pairs are scarce.
  previewPairAssignment: adminProcedure.query(async ({ ctx }) => {
    const beginnerIds = await beginnerTeamIds(ctx.db, CURRENT_EDITION);

    const unassignedTeams = await ctx.db.team.findMany({
      where: {
        isActive: true,
        mentorPair: null,
        id: { in: beginnerIds },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const pairs = await ctx.db.mentorPair.findMany({
      where: { edition: CURRENT_EDITION },
      select: {
        id: true,
        mentorA: { select: { name: true, email: true } },
        mentorB: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const steps: { teamId: string; teamName: string; pairId: string }[] = [];
    const unassignableTeams: typeof unassignedTeams = [];

    if (pairs.length === 0) {
      return { steps, unassignableTeams: unassignedTeams };
    }

    const conflicts = await ctx.db.mentorPairTeamConflict.findMany({
      where: { mentorPair: { edition: CURRENT_EDITION } },
      select: { mentorPairId: true, teamId: true },
    });

    const blocked = new Set(
      conflicts.map((conflict) => `${conflict.mentorPairId}:${conflict.teamId}`),
    );

    let cursor = 0;

    for (const team of unassignedTeams) {
      let pickedPairId: string | null = null;

      for (let offset = 0; offset < pairs.length; offset++) {
        const candidate = pairs[(cursor + offset) % pairs.length]!;

        if (!blocked.has(`${candidate.id}:${team.id}`)) {
          pickedPairId = candidate.id;
          cursor += offset + 1;
          break;
        }
      }

      if (pickedPairId) {
        steps.push({
          teamId: team.id,
          teamName: team.name,
          pairId: pickedPairId,
        });
      } else {
        unassignableTeams.push(team);
      }
    }

    return { steps, unassignableTeams };
  }),

  commitPairAssignment: adminProcedure
    .input(
      z.object({
        steps: z.array(z.object({ teamId: z.string(), pairId: z.string() })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.steps.length === 0) {
        return { assigned: 0 };
      }

      const conflicts = await ctx.db.mentorPairTeamConflict.findMany({
        where: {
          OR: input.steps.map((step) => ({
            mentorPairId: step.pairId,
            teamId: step.teamId,
          })),
        },
        select: { team: { select: { name: true } } },
      });

      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `A mentor reported knowing someone on ${conflicts
            .map((conflict) => conflict.team.name)
            .join(", ")}. Recompute the assignment plan.`,
        });
      }

      await ctx.db.$transaction(
        input.steps.map((step) =>
          ctx.db.teamMentorPair.create({
            data: { teamId: step.teamId, mentorPairId: step.pairId },
          }),
        ),
      );

      return { assigned: input.steps.length };
    }),

  assignPairToTeam: adminProcedure
    .input(z.object({ teamId: z.string(), pairId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conflict = await ctx.db.mentorPairTeamConflict.findUnique({
        where: {
          mentorPairId_teamId: {
            mentorPairId: input.pairId,
            teamId: input.teamId,
          },
        },
      });

      if (conflict) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "This pair reported knowing someone on this team. Clear the conflict first if you still want to assign them.",
        });
      }

      await ctx.db.teamMentorPair.upsert({
        where: { teamId: input.teamId },
        create: { teamId: input.teamId, mentorPairId: input.pairId },
        update: { mentorPairId: input.pairId },
      });

      return { success: true };
    }),

  // Escape hatch for a conflict reported by mistake.
  clearPairTeamConflict: adminProcedure
    .input(z.object({ pairId: z.string(), teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.mentorPairTeamConflict.deleteMany({
        where: { mentorPairId: input.pairId, teamId: input.teamId },
      });

      return { success: true };
    }),

  unassignPairFromTeam: adminProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.teamMentorPair
        .delete({ where: { teamId: input.teamId } })
        .catch(() => null);

      return { success: true };
    }),
});
