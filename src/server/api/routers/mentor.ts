import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, mentorProcedure } from "~/server/api/trpc";
import { CURRENT_EDITION } from "~/lib/registration";

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

      if (input.knowsSomeone) {
        /*
         * A conflict releases this team and looks for another beginner team
         * without a pair. If none is free, the pair is simply left without a
         * team until one opens up (auto-assign or manual admin action).
         */
        await ctx.db.teamMentorPair.delete({ where: { teamId: input.teamId } });

        const nextTeam = await ctx.db.team.findFirst({
          where: {
            isActive: true,
            mentorPair: null,
            id: { not: input.teamId },
            registrations: { some: { track: "BEGINNER", edition: CURRENT_EDITION } },
          },
          orderBy: { name: "asc" },
        });

        if (nextTeam) {
          await ctx.db.teamMentorPair.create({
            data: { teamId: nextTeam.id, mentorPairId: pair.id },
          });
        }

        return { reassigned: true, newTeamId: nextTeam?.id ?? null };
      }

      await ctx.db.teamMentorPair.update({
        where: { teamId: input.teamId },
        data: isMentorA
          ? { mentorAKnowsTeam: false }
          : { mentorBKnowsTeam: false },
      });

      return { reassigned: false, newTeamId: null };
    }),
});
