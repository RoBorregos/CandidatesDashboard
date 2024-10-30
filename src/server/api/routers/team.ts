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
          link: input.link,
        },
      });

      return team;
    }),

});
