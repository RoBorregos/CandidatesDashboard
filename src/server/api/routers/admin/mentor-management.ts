import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { CURRENT_EDITION } from "~/lib/registration";

const MENTOR_WHERE = { isMentor: true } as const;

export const mentorManagementRouter = createTRPCRouter({
  getMentors: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: MENTOR_WHERE,
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

  setUserMentor: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        isMentor: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }

      /*
       * Challenge groups are membership, not assignments with history, so
       * they're dropped instead of blocking the revoke — otherwise a
       * non-mentor would keep showing up as covering a challenge.
       */
      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: user.id },
          data: { isMentor: input.isMentor },
        }),
        ...(input.isMentor
          ? []
          : [
              ctx.db.mentorChallenge.deleteMany({
                where: { mentorId: user.id },
              }),
            ]),
      ]);

      return { success: true, isMentor: input.isMentor };
    }),

  /*
   * The pool for the "Mentor Access" picker. Everyone who ever logged in is
   * eligible, but whoever filled this edition's registration is a contestant,
   * so they are flagged and hidden by default instead of padding the list.
   *
   * Registration is matched by user link and by email: a member whose account
   * was never linked back to the registration would otherwise look eligible.
   */
  getMentorEligibleUsers: adminProcedure.query(async ({ ctx }) => {
    const [users, members] = await Promise.all([
      ctx.db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isStaff: true,
          isMentor: true,
        },
        orderBy: { name: "asc" },
      }),
      ctx.db.registrationMember.findMany({
        where: { edition: CURRENT_EDITION },
        select: { userId: true, email: true },
      }),
    ]);

    const registeredIds = new Set(
      members
        .map((member) => member.userId)
        .filter((userId): userId is string => Boolean(userId)),
    );

    const registeredEmails = new Set(
      members.map((member) => member.email.toLowerCase()),
    );

    return users.map((user) => ({
      ...user,
      hasRegistration:
        registeredIds.has(user.id) ||
        (!!user.email && registeredEmails.has(user.email.toLowerCase())),
    }));
  }),
});
