import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { z } from "zod";

export const teamManagementRouter = createTRPCRouter({
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

  getTeams: adminProcedure.query(async ({ ctx }) => {
    return await ctx.db.team.findMany({
      include: {
        members: true,
        rounds: {
          include: {
            challenges: true,
          },
          orderBy: {
            number: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

  toggleTeamStatus: adminProcedure
    .input(
      z.object({
        teamId: z.string(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedTeam = await ctx.db.team.update({
        where: { id: input.teamId },
        data: { isActive: input.isActive },
      });

      return {
        success: true,
        team: updatedTeam,
      };
    }),
});
