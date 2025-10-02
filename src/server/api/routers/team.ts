import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "rbrgs/server/api/trpc";

export const teamRouter = createTRPCRouter({
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
          select: {
            number: true,
            challenges: true,
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

  saveLink: protectedProcedure
    .input(z.object({ teamId: z.string(), link: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.update({
        where: {
          id: input.teamId,
        },
        data: {
          id: input.teamId,
          link: input.link,
        },
      });

      return team;
    }),

  getTeamIds: protectedProcedure.query(async ({ ctx }) => {
    const team = await ctx.db.team.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return team;
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
        name: 'asc',
      },
    });
  }),

  getUserRequest: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.teamRequest.findFirst({
      where: {
        userId: ctx.session.user.id,
        status: 'PENDING',
      },
    });
  }),

  requestTeamAssignment: protectedProcedure
    .input(z.object({
      requestedTeam: z.string(),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { team: true },
      });

      if (user?.team) {
        throw new Error("User already has a team");
      }

      const existingRequest = await ctx.db.teamRequest.findFirst({
        where: {
          userId: ctx.session.user.id,
          status: 'PENDING',
        },
      });

      if (existingRequest) {
        throw new Error("User already has a pending request");
      }

      return ctx.db.teamRequest.create({
        data: {
          userId: ctx.session.user.id,
          requestedTeam: input.requestedTeam,
          message: input.message,
        },
      });
    }),

});

// type TeamType = ReturnType<typeof teamRouter._def.procedures.getTeam>; 

// // export result type o fpromisse
// export typeof { TeamType };
// export
export type TeamType = ReturnType<typeof teamRouter._def.procedures.getTeam> extends Promise<infer T> ? T : never;
