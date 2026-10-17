type TeamScores = {
  teamId: string;
  teamName: string;
  rounds: Record<
    number,
    {
      challengeA: number;
      challengeB: number;
      challengeC: number;
    }
  >;
  total: number;
};

import { Role } from "@prisma/client";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { Round } from "rbrgs/lib/round";
import {
  compareTeams,
  countedRuns,
  hiddenScoreRound,
  latestByTeamAndRound,
  ROUND_NUMBERS,
  type TrackRun,
} from "rbrgs/lib/scoring";

/** 2026 scoreboard row: Pista A (MAZE) and Pista B (Niveles) per round. */
export type TrackTeamScores = {
  teamId: string;
  teamName: string;
  rounds: Record<number, { maze: number | null; levels: number | null }>;
  mazeTotal: number;
  levelsTotal: number;
  total: number;
  /** Seconds used in the counted runs; less wins a tie. */
  tiebreakSeconds: number;
};

export const scoreboardRouter = createTRPCRouter({
  getScoreboard: publicProcedure.query(async ({ ctx }) => {
    // Check if scoreboard frozen
    const config = await ctx.db.config.findFirst();
    const isAdmin = ctx.session?.user.role == Role.ADMIN;
    let isFrozen = config?.freeze ?? false;
    if (isAdmin) {
      isFrozen = false;
    }

    // Fetch all teams
    const teams = await ctx.db.team.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    // Fetch all challenges
    const [challengesA, challengesB, challengesC] = await Promise.all([
      ctx.db.challengeA.findMany(),
      ctx.db.challengeB.findMany(),
      ctx.db.challengeC.findMany(),
    ]);

    // Process scores for each team
    const teamScores: TeamScores[] = teams.map((team) => {
      const scores: TeamScores = {
        teamId: team.id,
        teamName: team.name,
        rounds: {},
        total: 0,
      };

      // Initialize rounds data using the Round enum
      Object.values(Round).forEach((roundId) => {
        if (typeof roundId === "number") {
          scores.rounds[roundId] = {
            challengeA: 0,
            challengeB: 0,
            challengeC: 0,
          };
        }
      });

      // Fill in challenge scores
      challengesA.forEach((challenge) => {
        if (challenge.teamId === team.id) {
          const roundId = Number(challenge.roundId);
          if (!isNaN(roundId) && scores.rounds[roundId]) {
            if ((roundId as Round) === Round.C && isFrozen) {
              scores.rounds[roundId].challengeA = 0;
            } else {
              scores.rounds[roundId].challengeA = challenge.points;
            }
          }
        }
      });

      challengesB.forEach((challenge) => {
        if (challenge.teamId === team.id) {
          const roundId = Number(challenge.roundId);
          if (!isNaN(roundId) && scores.rounds[roundId]) {
            if ((roundId as Round) === Round.C && isFrozen) {
              scores.rounds[roundId].challengeB = 0;
            } else {
              scores.rounds[roundId].challengeB = challenge.points;
            }
          }
        }
      });

      challengesC.forEach((challenge) => {
        if (challenge.teamId === team.id) {
          const roundId = Number(challenge.roundId);
          if (!isNaN(roundId) && scores.rounds[roundId]) {
            if ((roundId as Round) === Round.C && isFrozen) {
              scores.rounds[roundId].challengeC = 0;
            } else {
              scores.rounds[roundId].challengeC = challenge.points;
            }
          }
        }
      });

      // Calculate total
      //total is best two for each challenge

      const challenge_scores_sorted = {
        A: [] as number[],
        B: [] as number[],
        C: [] as number[],
      };

      for (const round of Object.values(scores.rounds)) {
        challenge_scores_sorted.A.push(round.challengeA);
        challenge_scores_sorted.B.push(round.challengeB);
        challenge_scores_sorted.C.push(round.challengeC);
      }

      challenge_scores_sorted.A.sort((a, b) => b - a);
      challenge_scores_sorted.B.sort((a, b) => b - a);
      challenge_scores_sorted.C.sort((a, b) => b - a);
      // remove the lowest score
      challenge_scores_sorted.A.pop();
      challenge_scores_sorted.B.pop();
      challenge_scores_sorted.C.pop();

      // scores.total = Object.values(scores.rounds).reduce(
      //   (sum, round) =>
      //     sum + round.challengeA + round.challengeB + round.challengeC,
      //   0,
      // );

      scores.total =
        challenge_scores_sorted.A.reduce((sum, score) => sum + score, 0) +
        challenge_scores_sorted.B.reduce((sum, score) => sum + score, 0) +
        challenge_scores_sorted.C.reduce((sum, score) => sum + score, 0);

      return scores;
    });

    // Sort by total score descending
    return teamScores.sort((a, b) => b.total - a.total);
  }),

  // 2026 edition: two tracks per round, scored with ~/lib/scoring.
  getTrackScoreboard: publicProcedure.query(async ({ ctx }) => {
    const config = await ctx.db.config.findFirst();
    const isAdmin = ctx.session?.user.role == Role.ADMIN;
    const hiddenRound = hiddenScoreRound(config?.freeze ?? false, isAdmin);

    const [teams, mazeRuns, levelsRuns] = await Promise.all([
      ctx.db.team.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
      ctx.db.mazeRun.findMany({ where: { edition: 2026 } }),
      ctx.db.levelsRun.findMany({ where: { edition: 2026 } }),
    ]);

    const maze = latestByTeamAndRound(mazeRuns);
    const levels = latestByTeamAndRound(levelsRuns);

    const rows: TrackTeamScores[] = teams.map((team) => {
      const rounds: TrackTeamScores["rounds"] = {};
      const mazeTrack: TrackRun[] = [];
      const levelsTrack: TrackRun[] = [];

      for (const round of ROUND_NUMBERS) {
        const visible = round !== hiddenRound;
        const mazeRun = visible ? maze.get(`${team.id}:${round}`) : undefined;
        const levelsRun = visible
          ? levels.get(`${team.id}:${round}`)
          : undefined;

        rounds[round] = {
          maze: mazeRun?.points ?? null,
          levels: levelsRun?.points ?? null,
        };
        if (mazeRun) {
          mazeTrack.push({
            round,
            points: mazeRun.points,
            seconds: mazeRun.runSeconds,
          });
        }
        if (levelsRun) {
          levelsTrack.push({
            round,
            points: levelsRun.points,
            seconds: levelsRun.runSeconds,
          });
        }
      }

      const counted = [...countedRuns(mazeTrack), ...countedRuns(levelsTrack)];
      const sum = (runs: TrackRun[]) =>
        runs.reduce((total, run) => total + run.points, 0);
      const mazeTotal = sum(countedRuns(mazeTrack));
      const levelsTotal = sum(countedRuns(levelsTrack));

      return {
        teamId: team.id,
        teamName: team.name,
        rounds,
        mazeTotal,
        levelsTotal,
        total: mazeTotal + levelsTotal,
        tiebreakSeconds: counted.reduce((total, run) => total + run.seconds, 0),
      };
    });

    return rows.sort(compareTeams);
  }),
});
