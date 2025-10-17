import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { z } from "zod";
import { Role } from "@prisma/client";

export const requestManagementRouter = createTRPCRouter({
  getPendingRequests: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.teamRequest.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  approveTeamRequest: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.teamRequest.findUnique({
        where: { id: input.requestId },
        include: { user: true },
      });

      if (!request) {
        throw new Error("Request not found");
      }

      const team = await ctx.db.team.findUnique({
        where: { name: request.requestedTeam },
        include: { _count: { select: { members: true } } },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      if (team._count.members >= 4) {
        throw new Error("Team is full");
      }

      await ctx.db.user.update({
        where: { id: request.userId },
        data: {
          teamId: team.id,
          role: Role.CONTESTANT,
        },
      });

      await ctx.db.teamRequest.update({
        where: { id: input.requestId },
        data: { status: "APPROVED" },
      });

      return { success: true };
    }),

  rejectTeamRequest: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.teamRequest.update({
        where: { id: input.requestId },
        data: { status: "REJECTED" },
      });

      return { success: true };
    }),
});
