/* eslint-disable */

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { z } from "zod";
import { Role } from "@prisma/client";

export const adminRouter = createTRPCRouter({
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

  getAllTeams: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      include: {
        members: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

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

  assignUserToTeam: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        teamName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { name: input.teamName },
        include: { _count: { select: { members: true } } },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      if (team._count.members >= 4) {
        throw new Error("Team is full. Maximum 4 members allowed.");
      }

      await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          teamId: team.id,
          role: Role.CONTESTANT,
        },
      });

      // Eliminar solicitud pendiente si existe
      await ctx.db.teamRequest.deleteMany({
        where: { userId: input.userId },
      });

      return { success: true };
    }),

  createTeam: adminProcedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.create({
        data: {
          name: input.name,
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
      });

      if (!team) {
        throw new Error("Team not found");
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
      await ctx.db.teamRequest.delete({
        where: { id: input.requestId },
      });

      return { success: true };
    }),

  removeUserFromTeam: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          teamId: null,
          role: Role.UNASSIGNED,
        },
      });

      return { success: true };
    }),
});
