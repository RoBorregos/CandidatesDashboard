import { z } from "zod";

import { createTRPCRouter, judgeProcedure } from "rbrgs/server/api/trpc";
import {
  challengeASchema,
  challengeBSchema,
  challengeCSchema,
} from "rbrgs/lib/schemas";

const computePointsLOP = (lackOfProgress: number) => {
  if (lackOfProgress == 0) {
    return 20;
  } else if (lackOfProgress == 1) {
    return 10;
  } else if (lackOfProgress == 2) {
    return 5;
  }
  return 0;
};

export const judgeRouter = createTRPCRouter({
  roundA: judgeProcedure
    .input(challengeASchema)
    .mutation(async ({ ctx, input }) => {
      let points = 0;

      // Calculate points for flags (20, 25, 30, 35)
      for (let i = 0; i < input.flagsAccomplished; i++) {
        points += 20 + i * 5;
      }

      // Add points for finishing the track
      if (input.finishedTrack) {
        points += 10;
      }

      // Add points for bonus
      if (input.genericFormSchema.obtainedBonus) {
        points += 30;
      }

      points += computePointsLOP(input.genericFormSchema.lackOfProgress);

      return await ctx.db.challengeA.create({
        data: {
          flagsAccomplished: input.flagsAccomplished,
          finishedTrack: input.finishedTrack,
          obtainedBonus: input.genericFormSchema.obtainedBonus,
          roundTimeSeconds: input.genericFormSchema.roundTimeSeconds,
          lackOfProgress: input.genericFormSchema.lackOfProgress,
          roundId: input.genericFormSchema.roundId,
          teamId: input.genericFormSchema.teamId,
          judgeID: ctx.session.user.id,
          points: points,
        },
      });
    }),

  roundB: judgeProcedure
    .input(challengeBSchema)
    .mutation(async ({ ctx, input }) => {
      let points = 0;
      points += input.trackPoints;
      points += computePointsLOP(input.genericFormSchema.lackOfProgress);

      return await ctx.db.challengeB.create({
        data: {
          trackPoints: input.trackPoints,
          lackOfProgress: input.genericFormSchema.lackOfProgress,
          points: points,
          roundTimeSeconds: input.genericFormSchema.roundTimeSeconds,
          teamId: input.genericFormSchema.teamId,
          judgeID: ctx.session.user.id,
          roundId: input.genericFormSchema.roundId,
        },
      });
    }),

  roundC: judgeProcedure
    .input(challengeCSchema)
    .mutation(async ({ ctx, input }) => {
      let points = 0;
      points += input.detectedColors * 5;
      points += input.finishedTrack ? 40 : 0;
      points += input.genericFormSchema.obtainedBonus ? 45 : 0;

      points += input.passedRamp ? 10 : 0;
      points += input.crossedRampWithoutLOP ? 10 : 0;
      points += input.balancedRamp ? 40 : 0;
      points += input.crossedRampWithoutTouching ? 20 : 0;
      points += computePointsLOP(input.genericFormSchema.lackOfProgress);

      return await ctx.db.challengeC.create({
        data: {
          detectedColors: input.detectedColors,
          finishedTrack: input.finishedTrack,
          obtainedBonus: input.genericFormSchema.obtainedBonus,

          passedRamp: input.passedRamp,
          crossedRampWithoutLOP: input.crossedRampWithoutLOP,
          balancedRamp: input.balancedRamp,
          crossedRampWithoutTouching: input.crossedRampWithoutTouching,

          lackOfProgress: input.genericFormSchema.lackOfProgress,
          points: points,
          roundTimeSeconds: input.genericFormSchema.roundTimeSeconds,
          teamId: input.genericFormSchema.teamId,
          judgeID: ctx.session.user.id,
          roundId: input.genericFormSchema.roundId,
        },
      });
    }),

  getTeamIds: judgeProcedure.query(async ({ ctx }) => {
    const team = await ctx.db.team.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return team;
  }),
  roundADelete: judgeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.challengeA.delete({
        where: {
          id: input.id,
        },
      });
    }),
  roundBDelete: judgeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.challengeB.delete({
        where: {
          id: input.id,
        },
      });
    }),
  roundCDelete: judgeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.challengeC.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
