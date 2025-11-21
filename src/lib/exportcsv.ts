import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
const prisma = new PrismaClient();

const EDITION_NAME = "LARC 2025";
const OUTPUT_FILE = path.resolve("public/PastEditions.json");

type TeamScore = {
  nombreEquipo: string;
  puntajePistaA: number;
  puntajePistaB: number;
  puntajePistaC: number;
  puntajeFinal: number;
};

// Helper to aggregate latest entries per (teamId, roundId), returning per-team round points
function accumulateLatest<
  T extends {
    teamId: string;
    roundId: string;
    createdAt: Date;
    points: number;
    team: { name: string };
  },
>(records: T[]) {
  const latest: Record<string, Record<string, T>> = {};
  for (const r of records) {
    const teamMap = latest[r.teamId] ?? (latest[r.teamId] = {});
    const existing = teamMap[r.roundId];
    if (!existing || existing.createdAt < r.createdAt) teamMap[r.roundId] = r;
  }
  const perTeam: Record<string, { name: string; rounds: number[] }> = {};
  for (const teamId of Object.keys(latest)) {
    const rounds = Object.values(latest[teamId]!).map((r) => r.points);
    perTeam[teamId] = {
      name: Object.values(latest[teamId]!)[0]!.team.name,
      rounds,
    };
  }
  return perTeam;
}

function sumTopTwo(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => b - a);
  const first = sorted[0] ?? 0;
  const second = sorted[1] ?? 0;
  return first + second;
}

export async function exportUsersToCSV() {
  try {
    // Fetch challenge records with minimal fields.
    const [aRecords, bRecords, cRecords] = await Promise.all([
      prisma.challengeA.findMany({
        select: {
          teamId: true,
          roundId: true,
          createdAt: true,
          points: true,
          team: { select: { name: true } },
        },
      }),
      prisma.challengeB.findMany({
        select: {
          teamId: true,
          roundId: true,
          createdAt: true,
          points: true,
          team: { select: { name: true } },
        },
      }),
      prisma.challengeC.findMany({
        select: {
          teamId: true,
          roundId: true,
          createdAt: true,
          points: true,
          team: { select: { name: true } },
        },
      }),
    ]);

    const aPerTeam = accumulateLatest(aRecords);
    const bPerTeam = accumulateLatest(bRecords);
    const cPerTeam = accumulateLatest(cRecords);

    // Collect unique teamIds from all challenges
    const teamIds = new Set<string>([
      ...Object.keys(aPerTeam),
      ...Object.keys(bPerTeam),
      ...Object.keys(cPerTeam),
    ]);

    // const yearKey = new Date().getFullYear().toString();
    const scores: TeamScore[] = [];
    for (const teamId of teamIds) {
      const name =
        aPerTeam[teamId]?.name ||
        bPerTeam[teamId]?.name ||
        cPerTeam[teamId]?.name ||
        "Unknown";
      const puntajePistaA = sumTopTwo(aPerTeam[teamId]?.rounds ?? []);
      const puntajePistaB = sumTopTwo(bPerTeam[teamId]?.rounds ?? []);
      const puntajePistaC = sumTopTwo(cPerTeam[teamId]?.rounds ?? []);
      const puntajeFinal = puntajePistaA + puntajePistaB + puntajePistaC;
      scores.push({
        nombreEquipo: name,
        puntajePistaA,
        puntajePistaB,
        puntajePistaC,
        puntajeFinal,
      });
    }

    // Sort descending by final score
    scores.sort((x, y) => y.puntajeFinal - x.puntajeFinal);

    // Load existing JSON file (if exists) and merge
    let existing: Record<string, TeamScore[]> = {};
    try {
      const raw = await fs.readFile(OUTPUT_FILE, "utf8");
      existing = JSON.parse(raw);
    } catch (e) {
      // File may not exist yet; proceed with empty structure
      existing = {};
    }

    existing[EDITION_NAME] = scores; // Replace / create current year entry

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(existing, null, 2), "utf8");
    return scores;
  } catch (error) {
    console.error("Failed to export edition scores:", error);
    throw error;
  }
}

// Invoke immediately when this module is run (script usage)
try {
  await exportUsersToCSV();
} finally {
  await prisma.$disconnect();
}
