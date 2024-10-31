import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "rbrgs/server/api/trpc";
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
  roundA: protectedProcedure
    .input(challengeASchema)
    .mutation(async ({ ctx, input }) => {
      let points = 0;
      if (input.ballContact) {
        points += 15;
      }
      if (input.ballSaved) {
        points += 45;
      }
      if (input.finishTrack) {
        points += 10;
      }
      if (input.finishTrackNoCrossingLine) {
        points += 30;
      }
      if (input.genericFormSchema.obtainedBonus) {
        points += 50;
      }

      points += computePointsLOP(input.genericFormSchema.lackOfProgress);

      return await ctx.db.challengeA.create({
        data: {
          ballContact: input.ballContact,
          ballSaved: input.ballSaved,
          finshTrack: input.finishTrack,
          finishTrackNoCrossingLine: input.finishTrackNoCrossingLine,
          lackOfProgress: input.genericFormSchema.lackOfProgress,
          obtainedBonus: input.genericFormSchema.obtainedBonus,
          points: points,
          roundTimeSeconds: input.genericFormSchema.roundTimeSeconds,
          teamId: input.genericFormSchema.teamId,
          judgeID: ctx.session.user.id,
          roundId: input.genericFormSchema.roundId,
        },
      });
    }),

  roundB: protectedProcedure
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

  roundC: protectedProcedure
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

  getTeamIds: protectedProcedure.query(async ({ ctx }) => {
    const team = await ctx.db.team.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return team;
  }),
  roundADelete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.challengeA.delete({
        where: {
          id: input.id,
        },
      });
    }),
  roundBDelete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.challengeB.delete({
        where: {
          id: input.id,
        },
      });
    }),
  roundCDelete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.challengeC.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
