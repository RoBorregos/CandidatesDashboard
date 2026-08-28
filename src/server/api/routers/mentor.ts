import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, mentorProcedure } from "~/server/api/trpc";
import { CURRENT_EDITION } from "~/lib/registration";
import { beginnerTeamWhere } from "~/server/teams";

export const mentorRouter = createTRPCRouter({
  getMyPair: mentorProcedure.query(async ({ ctx }) => {
    return ctx.db.mentorPair.findFirst({
      where: {
        edition: CURRENT_EDITION,
        OR: [
          { mentorAId: ctx.session.user.id },
          { mentorBId: ctx.session.user.id },
        ],
      },
      include: {
        mentorA: { select: { id: true, name: true, email: true } },
        mentorB: { select: { id: true, name: true, email: true } },
        teams: {
          include: {
            team: {
              include: {
                members: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    interviewArea: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }),

  // My individually assigned (advanced) candidates.
  getMyAssignments: mentorProcedure.query(async ({ ctx }) => {
    return ctx.db.mentorAssignment.findMany({
      where: { mentorId: ctx.session.user.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        registrationMember: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  /*
   * Advanced candidates are covered by challenge, not one by one: whoever is
   * listed for a challenge this edition mentors everyone registered for it.
   */
  getMyChallengeCandidates: mentorProcedure.query(async ({ ctx }) => {
    const myChallenges = await ctx.db.mentorChallenge.findMany({
      where: { mentorId: ctx.session.user.id, edition: CURRENT_EDITION },
      select: { challenge: true },
      orderBy: { challenge: "asc" },
    });

    if (myChallenges.length === 0) {
      return [];
    }

    const challenges = myChallenges.map((row) => row.challenge);

    const members = await ctx.db.registrationMember.findMany({
      where: {
        registration: {
          edition: CURRENT_EDITION,
          track: "ADVANCED",
          challenge: { in: challenges },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        interviewArea: true,
        registration: { select: { challenge: true } },
      },
      orderBy: { name: "asc" },
    });

    return challenges.map((challenge) => ({
      challenge,
      candidates: members
        .filter((member) => member.registration.challenge === challenge)
        .map(({ registration: _registration, ...member }) => member),
    }));
  }),

  reportTeamConflict: mentorProcedure
    .input(z.object({ teamId: z.string(), knowsSomeone: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const pair = await ctx.db.mentorPair.findFirst({
        where: {
          edition: CURRENT_EDITION,
          OR: [
            { mentorAId: ctx.session.user.id },
            { mentorBId: ctx.session.user.id },
          ],
        },
      });

      if (!pair) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have a mentor pair.",
        });
      }

      const assignment = await ctx.db.teamMentorPair.findUnique({
        where: { teamId: input.teamId },
      });

      if (!assignment || assignment.mentorPairId !== pair.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This team isn't assigned to your pair.",
        });
      }

      const isMentorA = pair.mentorAId === ctx.session.user.id;

      if (!input.knowsSomeone) {
        await ctx.db.teamMentorPair.update({
          where: { teamId: input.teamId },
          data: isMentorA
            ? { mentorAKnowsTeam: false }
            : { mentorBKnowsTeam: false },
        });

        return { reassigned: false, newTeamId: null };
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.mentorPairTeamConflict.upsert({
          where: {
            mentorPairId_teamId: {
              mentorPairId: pair.id,
              teamId: input.teamId,
            },
          },
          create: {
            mentorPairId: pair.id,
            teamId: input.teamId,
            reportedById: ctx.session.user.id,
          },
          update: {},
        });

        await tx.teamMentorPair.delete({ where: { teamId: input.teamId } });

        const conflicts = await tx.mentorPairTeamConflict.findMany({
          where: { mentorPairId: pair.id },
          select: { teamId: true },
        });

        // Covers input.teamId too — it was just recorded above.
        const nextTeam = await tx.team.findFirst({
          where: {
            isActive: true,
            mentorPair: null,
            id: { notIn: conflicts.map((conflict) => conflict.teamId) },
            ...beginnerTeamWhere(CURRENT_EDITION),
          },
          orderBy: { name: "asc" },
        });

        if (nextTeam) {
          await tx.teamMentorPair.create({
            data: { teamId: nextTeam.id, mentorPairId: pair.id },
          });
        }

        return { reassigned: true, newTeamId: nextTeam?.id ?? null };
      });
    }),
});
