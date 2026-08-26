import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { z } from "zod";
import { db } from "rbrgs/server/db";
import { CURRENT_EDITION } from "~/lib/registration";
import { roleAfterJoiningTeam, roleAfterLeavingTeam } from "~/lib/roles";

export const userManagementRouter = createTRPCRouter({
  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      include: {
        team: true,
      },
      orderBy: {
        email: "asc",
      },
    });

  
    const registrationMembers = await ctx.db.registrationMember.findMany({
      where: {
        registration: { edition: CURRENT_EDITION },
        email: {
          in: users.flatMap((user) => (user.email ? [user.email] : [])),
        },
      },
      select: {
        email: true,
        registration: { select: { track: true, status: true } },
      },
    });

    const byEmail = new Map(
      registrationMembers.map((member) => [
        member.email.toLowerCase(),
        member.registration,
      ]),
    );

    return users.map((user) => ({
      ...user,
      registration: user.email
        ? (byEmail.get(user.email.toLowerCase()) ?? null)
        : null,
    }));
  }),

  assignUserToTeam: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        teamName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const team = await db.team.findUnique({
        where: { name: input.teamName },
        include: { _count: { select: { members: true } } },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      if (team._count.members >= 4) {
        throw new Error("Team is full. Maximum 4 members allowed.");
      }

      const userRole = await db.user
        .findUnique({
          where: { id: input.userId },
        })
        .then((user) => user?.role);

      console.log("Assigning user with role:", userRole);

      await db.user.update({
        where: { id: input.userId },
        data: {
          teamId: team.id,
          role: roleAfterJoiningTeam(userRole),
        },
      });

      return { success: true };
    }),

  removeUserFromTeam: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const userRole = await db.user
        .findUnique({
          where: { id: input.userId },
        })
        .then((user) => user?.role);

      await db.user.update({
        where: { id: input.userId },
        data: {
          teamId: null,
          role: roleAfterLeavingTeam(userRole),
        },
      });

      return { success: true };
    }),
});
