import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient, InterviewArea, Role } from "@prisma/client";

const prisma = new PrismaClient();

type Row = Record<string, string>;

function mapArea(row: Row): InterviewArea | null {
  const progra = String(row.Progra || "").toUpperCase() === "TRUE";
  const mecanica = String(row.Mecanica || "").toUpperCase() === "TRUE";
  const electronica = String(row.Electronica || "").toUpperCase() === "TRUE";

  if (mecanica && !progra && !electronica) return InterviewArea.MECHANICS;
  if (electronica && !progra && !mecanica) return InterviewArea.ELECTRONICS;
  if (progra && !mecanica && !electronica) return InterviewArea.PROGRAMMING;

  if (progra) return InterviewArea.PROGRAMMING;
  if (mecanica) return InterviewArea.MECHANICS;
  if (electronica) return InterviewArea.ELECTRONICS;

  return null;
}

async function main() {
  const csvPath = path.resolve(process.cwd(), "Candidates2025.csv");
  const raw = fs.readFileSync(csvPath, "utf8");
  let records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Row[];

  console.log(`Found ${records.length} rows in ${csvPath}`);
  // Normalize headers (strip BOM)
  records = records.map((rec) => {
    const obj: Row = {};
    for (const k of Object.keys(rec)) {
      const clean = k.replace(/^\uFEFF/, "").trim();
      obj[clean] = String(rec[k] || "");
    }
    return obj;
  });

  const DRY_RUN =
    process.env.DRY_RUN === "true" || process.argv.includes("--dry");
  const FORCE =
    process.env.FORCE === "true" || process.argv.includes("--force");
  const REPLACE =
    process.env.REPLACE === "true" || process.argv.includes("--replace");
  if (DRY_RUN)
    console.log("Running in DRY RUN mode: no writes to DB will be performed");

  if (FORCE)
    console.log(
      "FORCE mode: will delete existing contestant users and teams before seeding",
    );
  if (REPLACE)
    console.log(
      "REPLACE mode: will delete existing teams present in CSV (and their users) before seeding",
    );

  const normalizeTeam = (t: string) => {
    if (!t) return "";
    let s = t.replace(/^"+|"+$/g, "");
    s = s.replace(/""/g, '"');
    s = s.replace(/\s+/g, " ").trim();
    return s;
  };

  const teamsMap = new Map<string, Row[]>();
  let processed = 0;
  let emptyTeam = 0;
  const samples: Array<{ rawTeam: string; teamName: string }> = [];
  for (const r of records) {
    processed++;
    const rawTeam = r.Equipo || r.team || "";
    const teamName = normalizeTeam(rawTeam);
    if (!teamName) emptyTeam++;
    else {
      if (!teamsMap.has(teamName)) teamsMap.set(teamName, []);
      teamsMap.get(teamName)!.push(r);
    }
    if (samples.length < 20)
      samples.push({ rawTeam: String(rawTeam), teamName });
  }

  console.log(
    `Processed rows=${processed} emptyTeam=${emptyTeam} teamsMap.size=${teamsMap.size}`,
  );
  console.log("First 20 rawTeam -> normalized:", samples);

  let totalCreatedTeams = 0;
  let totalCreatedUsers = 0;
  let totalSkippedUsers = 0;

  // If FORCE, remove existing contestant users and teams
  if (!DRY_RUN && FORCE) {
    console.log("Deleting all contestant users and all teams (FORCE)");
    await prisma.user.deleteMany({ where: { role: "CONTESTANT" } as any });
    await prisma.team.deleteMany({});
  } else if (DRY_RUN && FORCE) {
    console.log(
      "DRY RUN: would delete all contestant users and all teams (FORCE)",
    );
  }

  // If REPLACE, remove existing teams that match the CSV team names (and their users)
  if (REPLACE) {
    const teamNames = Array.from(teamsMap.keys());
    if (teamNames.length > 0) {
      if (DRY_RUN) {
        console.log("DRY RUN: would delete teams with names:", teamNames);
      } else {
        const existingTeams = await prisma.team.findMany({
          where: { name: { in: teamNames } },
        });
        const ids = existingTeams.map((t) => t.id);
        if (ids.length > 0) {
          console.log("Deleting users for teams:", ids);
          await prisma.user.deleteMany({
            where: { teamId: { in: ids } } as any,
          });
          console.log("Deleting teams:", ids);
          await prisma.team.deleteMany({ where: { id: { in: ids } } as any });
        }
      }
    }
  }

  for (const [teamName, members] of teamsMap) {
    console.log(`Processing team="${teamName}" members=${members.length}`);
    let team: { id: string; name: string } | null = null;
    // find existing team
    if (!DRY_RUN) {
      team = await prisma.team.findUnique({ where: { name: teamName } });
    }
    if (!team) {
      if (DRY_RUN) {
        team = { id: `dry_${teamName}`, name: teamName };
        console.log(`DRY RUN: would create team ${teamName}`);
        totalCreatedTeams++;
      } else {
        team = await prisma.team.create({ data: { name: teamName } });
        totalCreatedTeams++;
      }
    } else {
      console.log(`Found existing team ${teamName} id=${team.id}`);
    }

    for (const m of members) {
      const name = (m.Nombre || m.name || "").trim();
      if (!name) continue;
      const interviewArea = mapArea(m);
      const existing = DRY_RUN
        ? null
        : await prisma.user.findFirst({ where: { name, teamId: team.id } });
      if (existing) {
        totalSkippedUsers++;
        console.log(`Skipping existing user name="${name}" team="${teamName}"`);
        continue;
      }
      if (DRY_RUN) {
        console.log(
          `DRY RUN: would create user name="${name}" team="${teamName}" area=${interviewArea}`,
        );
        totalCreatedUsers++;
      } else {
        await prisma.user.create({
          data: {
            name,
            role: Role.CONTESTANT,
            interviewArea: interviewArea || undefined,
            team: { connect: { id: team.id } },
          },
        });
        totalCreatedUsers++;
      }
    }
  }

  console.log("Seeding finished");
  console.log(
    `Totals: teams=${teamsMap.size} createdTeams=${totalCreatedTeams} createdUsers=${totalCreatedUsers} skippedUsers=${totalSkippedUsers}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
