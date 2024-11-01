// types.ts
type Challenge = {
  roundId: number;
  points: number;
  teamId: string;
};

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

// server/api/routers/scores.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { Round } from "rbrgs/lib/round";

export const scoreboardRouter = createTRPCRouter({
  getScoreboard: publicProcedure.query(async ({ ctx }) => {
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
            scores.rounds[roundId].challengeA = challenge.points;
          }
        }
      });

      challengesB.forEach((challenge) => {
        if (challenge.teamId === team.id) {
          const roundId = Number(challenge.roundId);
          if (!isNaN(roundId) && scores.rounds[roundId]) {
            scores.rounds[roundId].challengeB = challenge.points;
          }
        }
      });

      challengesC.forEach((challenge) => {
        if (challenge.teamId === team.id) {
          const roundId = Number(challenge.roundId);
          if (!isNaN(roundId) && scores.rounds[roundId]) {
            scores.rounds[roundId].challengeC = challenge.points;
          }
        }
      });

      // Calculate total
      scores.total = Object.values(scores.rounds).reduce(
        (sum, round) =>
          sum + round.challengeA + round.challengeB + round.challengeC,
        0,
      );

      return scores;
    });

    // Sort by total score descending
    return teamScores.sort((a, b) => b.total - a.total);
  }),
});
