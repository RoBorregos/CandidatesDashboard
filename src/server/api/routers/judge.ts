import { z } from "zod";

import { createTRPCRouter, judgeProcedure } from "rbrgs/server/api/trpc";
import {
  challengeASchema,
  challengeBSchema,
  challengeCSchema,
  levelsRunSchema,
  mazeRunSchema,
} from "rbrgs/lib/schemas";
import { computeLevelsPoints, computeMazePoints } from "rbrgs/lib/scoring";
import { type LaneRun, parseTrack } from "rbrgs/lib/competition-schedule";
import { CURRENT_EDITION } from "rbrgs/lib/registration";

const computePointsLOP = (lackOfProgress: number) => {
  switch (lackOfProgress) {
    case 0:
      return 20;
    case 1:
      return 10;
    case 2:
      return 5;
    default:
      return 0;
  }
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
      points += input.trackData.trackPoints;
      points += computePointsLOP(input.genericFormSchema.lackOfProgress);

      return await ctx.db.challengeB.create({
        data: {
          trackPoints: input.trackData.trackPoints,
          patternsPassed: input.trackData.patternsPassed,
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
      points += input.detectedColors * 3;
      points += input.passedObstacles * 8;
      points += input.finishedTrack ? 35 : 0;
      points += input.genericFormSchema.obtainedBonus ? 41 : 0;

      points += input.passedRamp ? 10 : 0;
      points += input.crossedRampWithoutLOP ? 10 : 0;
      points += input.reverseRamp ? 40 : 0;
      points += input.crossedRampWithoutTouching ? 20 : 0;
      points += computePointsLOP(input.genericFormSchema.lackOfProgress);

      return await ctx.db.challengeC.create({
        data: {
          detectedColors: input.detectedColors,
          finishedTrack: input.finishedTrack,
          obtainedBonus: input.genericFormSchema.obtainedBonus,

          passedObstacles: input.passedObstacles,
          passedRamp: input.passedRamp,
          crossedRampWithoutLOP: input.crossedRampWithoutLOP,
          crossedRampWithoutTouching: input.crossedRampWithoutTouching,
          reverseRamp: input.reverseRamp,

          lackOfProgress: input.genericFormSchema.lackOfProgress,
          points: points,
          roundTimeSeconds: input.genericFormSchema.roundTimeSeconds,
          teamId: input.genericFormSchema.teamId,
          judgeID: ctx.session.user.id,
          roundId: input.genericFormSchema.roundId,
        },
      });
    }),

  // 2026 tracks. Points are always recomputed here from ~/lib/scoring; the
  // live subtotal the form shows is only a preview.
  mazeRun: judgeProcedure
    .input(mazeRunSchema)
    .mutation(async ({ ctx, input }) => {
      const data = {
        ...input,
        judgeId: ctx.session.user.id,
        points: computeMazePoints(input),
      };
      // Re-submitting a team's round replaces its evaluation rather than
      // stacking a second row that only the scoreboard knows to ignore.
      return await ctx.db.mazeRun.upsert({
        where: {
          teamId_edition_round: {
            teamId: input.teamId,
            edition: CURRENT_EDITION,
            round: input.round,
          },
        },
        create: data,
        update: data,
      });
    }),

  levelsRun: judgeProcedure
    .input(levelsRunSchema)
    .mutation(async ({ ctx, input }) => {
      const data = {
        ...input,
        judgeId: ctx.session.user.id,
        points: computeLevelsPoints(input),
      };
      return await ctx.db.levelsRun.upsert({
        where: {
          teamId_edition_round: {
            teamId: input.teamId,
            edition: CURRENT_EDITION,
            round: input.round,
          },
        },
        create: data,
        update: data,
      });
    }),

  mazeRunDelete: judgeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.mazeRun.delete({ where: { id: input.id } });
    }),

  levelsRunDelete: judgeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.levelsRun.delete({ where: { id: input.id } });
    }),

  /**
   * Every stored 2026 run of the active teams, revealed or not, so each lane
   * can pick its team from the clock. serverNow lets the client correct its
   * own clock before running the timers.
   */
  getTrackLineup: judgeProcedure.query(async ({ ctx }) => {
    const rounds = await ctx.db.round.findMany({
      where: { team: { isActive: true } },
      select: {
        number: true,
        team: { select: { id: true, name: true } },
        challenges: { select: { name: true, time: true } },
      },
    });

    const runs: LaneRun[] = rounds.flatMap((round) =>
      round.challenges.flatMap((challenge) => {
        const parsed = parseTrack(challenge.name);
        if (!round.team || !parsed) return [];
        return [
          {
            teamId: round.team.id,
            teamName: round.team.name,
            round: round.number,
            lane: parsed.lane,
            start: challenge.time,
          },
        ];
      }),
    );

    return { serverNow: new Date(), runs };
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
