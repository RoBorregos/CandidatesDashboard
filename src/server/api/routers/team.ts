import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Role } from "@prisma/client";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const teamRouter = createTRPCRouter({
  createTeam: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        userArea: z
          .enum(["MECHANICS", "ELECTRONICS", "PROGRAMMING"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent duplicate names
      const existingTeam = await ctx.db.team.findUnique({
        where: { name: input.name },
      });
      if (existingTeam) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Team with this name already exists",
        });
      }

      // Create the new team
      const team = await ctx.db.team.create({
        data: { name: input.name },
      });

      // Clear any pending team request from this user
      await ctx.db.teamRequest.deleteMany({
        where: { userId: ctx.session.user.id },
      });

      // Assign user to the team and set role/interview area

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          teamId: team.id,
          role:
            ctx.session.user.role === Role.ADMIN ||
            ctx.session.user.role === Role.JUDGE
              ? ctx.session.user.role
              : Role.CONTESTANT,
          ...(input.userArea ? { interviewArea: input.userArea } : {}),
        },
      });

      return team;
    }),
  getTeam: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findFirst({
      where: {
        id: ctx.session.user.id,
      },
    });

    if (!user?.teamId) {
      return null;
    }

    const team = await ctx.db.team.findFirst({
      where: {
        id: user?.teamId,
      },
      include: {
        members: true,
        rounds: {
          where: {
            isVisible: true,
          },
          select: {
            number: true,
            challenges: true,
            isVisible: true,
          },
          orderBy: {
            number: "asc",
          },
        },
        challengeA: true,
        challengeB: true,
        challengeC: true,
      },
    });
    console.log(team);
    return team;
  }),

  saveDriveLink: protectedProcedure
    .input(z.object({ teamId: z.string(), link: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.update({
        where: {
          id: input.teamId,
        },
        data: {
          id: input.teamId,
          driveLink: input.link,
        },
      });
      return team;
    }),

  saveGithubLink: protectedProcedure
    .input(z.object({ teamId: z.string(), link: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.update({
        where: {
          id: input.teamId,
        },
        data: {
          id: input.teamId,
          githubLink: input.link,
        },
      });
      return team;
    }),

  getTeamIds: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  }),
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        team: true,
      },
    });
  }),

  getAllTeams: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

  leaveTeam: protectedProcedure.mutation(async ({ ctx }) => {
    const teamRequest = await ctx.db.teamRequest.findFirst({
      where: { userId: ctx.session.user.id },
    });

    if (teamRequest) {
      await ctx.db.teamRequest.delete({
        where: { id: teamRequest.id },
      });
    }

    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: {
        teamId: null,
        role:
          ctx.session.user.role === Role.CONTESTANT
            ? Role.UNASSIGNED
            : ctx.session.user.role,
      },
    });

    return { success: true };
  }),

  // Get visible schedules for all active teams (public access)
  getVisibleSchedules: publicProcedure.query(async ({ ctx }) => {
    const teams = await ctx.db.team.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        rounds: {
          where: {
            isVisible: true,
          },
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

    return teams;
  }),

});

export type TeamType =
  ReturnType<typeof teamRouter._def.procedures.getTeam> extends Promise<infer T>
    ? T
    : never;
