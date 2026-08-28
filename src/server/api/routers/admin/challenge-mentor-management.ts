import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { ADVANCED_CHALLENGES, CURRENT_EDITION } from "~/lib/registration";

const MENTOR_SELECT = { id: true, name: true, email: true } as const;

/*
 * Advanced candidates already carry their challenge on the registration, so
 * the admin only picks which mentors cover each challenge — the candidate
 * side of the grouping needs no assignment step.
 */
export const challengeMentorManagementRouter = createTRPCRouter({
  getChallengeGroups: adminProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.registrationMember.findMany({
      where: {
        registration: { edition: CURRENT_EDITION, track: "ADVANCED" },
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

    const mentorChallenges = await ctx.db.mentorChallenge.findMany({
      where: { edition: CURRENT_EDITION },
      select: { challenge: true, mentor: { select: MENTOR_SELECT } },
      orderBy: { createdAt: "asc" },
    });

    const groups = ADVANCED_CHALLENGES.map((challenge) => ({
      challenge,
      mentors: mentorChallenges
        .filter((row) => row.challenge === challenge)
        .map((row) => row.mentor),
      candidates: members
        .filter((member) => member.registration.challenge === challenge)
        .map(({ registration: _registration, ...member }) => member),
    }));

    /*
     * Anything whose challenge is empty or no longer in ADVANCED_CHALLENGES
     * would silently vanish from the groups above. Surface it instead — those
     * candidates still need a mentor.
     */
    const known = new Set<string>(ADVANCED_CHALLENGES);

    const ungrouped = members
      .filter(
        (member) =>
          !member.registration.challenge ||
          !known.has(member.registration.challenge),
      )
      .map(({ registration, ...member }) => ({
        ...member,
        challenge: registration.challenge,
      }));

    return { groups, ungrouped };
  }),

  setChallengeMentors: adminProcedure
    .input(
      z.object({
        challenge: z.enum(ADVANCED_CHALLENGES),
        mentorIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const mentorIds = [...new Set(input.mentorIds)];

      if (mentorIds.length > 0) {
        const mentors = await ctx.db.user.findMany({
          where: { id: { in: mentorIds }, isMentor: true },
          select: { id: true },
        });

        if (mentors.length !== mentorIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Every selected user must have mentor access.",
          });
        }
      }

      // Replace the whole group so unchecking a mentor removes them.
      await ctx.db.$transaction([
        ctx.db.mentorChallenge.deleteMany({
          where: {
            challenge: input.challenge,
            edition: CURRENT_EDITION,
            mentorId: { notIn: mentorIds },
          },
        }),
        ctx.db.mentorChallenge.createMany({
          data: mentorIds.map((mentorId) => ({
            mentorId,
            challenge: input.challenge,
            edition: CURRENT_EDITION,
          })),
          skipDuplicates: true,
        }),
      ]);

      return { success: true, mentors: mentorIds.length };
    }),
});
