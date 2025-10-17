import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { z } from "zod";
import { Role } from "@prisma/client";
import { db } from "rbrgs/server/db";

export const userManagementRouter = createTRPCRouter({
  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      include: {
        team: true,
      },
      orderBy: {
        email: "asc",
      },
    });
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
          role:
            userRole === Role.ADMIN || userRole === Role.JUDGE
              ? userRole
              : Role.CONTESTANT,
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
          role:
            userRole === Role.ADMIN || userRole === Role.JUDGE
              ? userRole
              : Role.UNASSIGNED,
        },
      });

      return { success: true };
    }),
});
