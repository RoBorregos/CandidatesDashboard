import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { parse } from "csv-parse";
import { parse as parseCsv } from "csv-parse/sync";
import fs from "fs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { normalize } from "~/lib/name-match";
import { detectDelimiter, scheduleFromCsvRows } from "~/lib/schedule-csv";
import {
  buildTrackSchedule,
  competitionTime,
  findScheduleConflicts,
  formatTime,
  INTERVIEW_MS,
  MINUTE_MS,
  scheduleFromStoredRuns,
  SEGMENT_MS,
  shuffled,
  trackLayout,
  type Area,
  type RoundWindow,
  type TeamRoundSchedule,
} from "~/lib/competition-schedule";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");

/** The admin form: competition day plus the three round windows (CDMX time). */
const trackScheduleInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  windows: z
    .array(
      z.object({
        number: z.number().int().min(1).max(3),
        start: hhmm,
        end: hhmm,
      }),
    )
    .length(3),
});

function toRoundWindows(
  input: z.infer<typeof trackScheduleInput>,
): RoundWindow[] {
  return input.windows.map((w) => {
    const start = competitionTime(w.start, input.date);
    const end = competitionTime(w.end, input.date);
    if (end <= start) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Round ${w.number}: the end time must be after the start time.`,
      });
    }
    return { number: w.number, start, end };
  });
}

/**
 * Checks the interviews already booked for these teams against their whole
 * stored schedule, as rows for the admin page.
 */
async function findInterviewConflicts(
  db: PrismaClient,
  teamIds: string[],
  windows: RoundWindow[],
) {
  const stored = await db.round.findMany({
    where: { teamId: { in: teamIds } },
    select: { teamId: true, number: true, challenges: true },
  });
  const fullSchedule = stored
    .map((round) =>
      round.teamId
        ? scheduleFromStoredRuns(round.teamId, round.number, round.challenges)
        : null,
    )
    .filter((entry): entry is TeamRoundSchedule => entry !== null);

  const interviewed = await db.user.findMany({
    where: {
      teamId: { in: teamIds },
      interviewTime: { not: null },
      interviewerId: { not: null },
    },
    select: {
      id: true,
      name: true,
      teamId: true,
      interviewArea: true,
      interviewTime: true,
      interviewerId: true,
      team: { select: { name: true } },
    },
  });
  const conflicts = findScheduleConflicts(
    interviewed.map((u) => ({
      id: u.id,
      teamId: u.teamId!,
      area: (u.interviewArea as Area | null) ?? null,
    })),
    interviewed.map((u) => ({
      candidateId: u.id,
      interviewerId: u.interviewerId!,
      start: u.interviewTime!,
      end: new Date(u.interviewTime!.getTime() + INTERVIEW_MS),
    })),
    fullSchedule,
    windows,
  );
  const byId = new Map(interviewed.map((u) => [u.id, u]));

  return conflicts.map((c) => {
    const user = byId.get(c.candidateId);
    return {
      name: user?.name ?? c.candidateId,
      team: user?.team?.name ?? "",
      time: user?.interviewTime ? formatTime(user.interviewTime) : "",
      reason: c.reason,
    };
  });
}

// Helper function to compute date from time string
const ComputeDate = ({ date }: { date: string | undefined }) => {
  if (date === undefined) {
    const inv = new Date();
    inv.setHours(0);
    inv.setMinutes(0);
    return inv;
  }

  const timeParts = date.split(":");
  const hour = parseInt(timeParts[0] ?? "0");
  const minute = timeParts[1];

  const d = new Date();
  d.setHours(hour);
  d.setMinutes(parseInt(minute ?? "0"));
  return d;
};

export const scheduleManagementRouter = createTRPCRouter({
  /*
   * 2026 schedule (see ~/lib/competition-schedule): three rounds, each team
   * runs Pista A and Pista B once per round on 2 A + 2 B tracks, with at
   * least 55 min between its two tracks. The 2025 generators further down are kept but no longer used by
   * the admin dashboard.
   */

  /**
   * Schedules the given rounds with the times in the form.
   *
   * A round that is already stored is only shifted: every stored run moves
   * by (new start - current first run), so teams keep their slots and tracks
   * even if teams were deactivated since (their lane just stays empty) and a
   * revealed round never gets reshuffled. A round with nothing stored, or
   * every selected round when `rebuild` is set, is built from scratch for the
   * active teams in a new random order. Returns the interviews that clash
   * with the new times.
   */
  generateTrackSchedule: adminProcedure
    .input(
      trackScheduleInput.extend({
        rounds: z.array(z.number().int().min(1).max(3)).min(1),
        rebuild: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const windows = toRoundWindows(input);
      const selected = windows.filter((w) => input.rounds.includes(w.number));

      const activeTeams = await ctx.db.team.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      const teamIds = activeTeams.map((team) => team.id);

      // Stored runs of every team (inactive ones too, so the first slot is
      // still found when its team dropped out).
      const storedRounds = await ctx.db.round.findMany({
        where: { number: { in: input.rounds } },
        select: {
          number: true,
          teamId: true,
          challenges: { select: { time: true } },
        },
      });

      const toShift: { window: RoundWindow; deltaMs: number }[] = [];
      const toBuild: RoundWindow[] = [];
      for (const window of selected) {
        const times = storedRounds
          .filter((round) => round.number === window.number)
          .flatMap((round) => round.challenges.map((c) => c.time.getTime()));
        if (input.rebuild || times.length === 0) {
          toBuild.push(window);
          continue;
        }

        const deltaMs = window.start.getTime() - Math.min(...times);
        const lastEnd = Math.max(...times) + SEGMENT_MS + deltaMs;
        if (lastEnd > window.end.getTime()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Round ${window.number}: shifted to ${formatTime(window.start)}, the last run would end at ${formatTime(new Date(lastEnd))}, after the window ends (${formatTime(window.end)}).`,
          });
        }
        toShift.push({ window, deltaMs });
      }

      if (toBuild.length > 0 && teamIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active teams found",
        });
      }

      let schedule: TeamRoundSchedule[];
      try {
        schedule = toBuild.flatMap((window) =>
          buildTrackSchedule(shuffled(teamIds), [window]),
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : String(error),
        });
      }

      await ctx.db.$transaction(
        async (tx) => {
          for (const { window, deltaMs } of toShift) {
            await tx.$executeRaw`
              UPDATE "Challenge"
              SET "time" = "time" + ${deltaMs}::double precision * INTERVAL '1 millisecond'
              WHERE "roundId" IN (SELECT "id" FROM "Round" WHERE "number" = ${window.number})`;
          }

          for (const window of toBuild) {
            const wasVisible =
              (await tx.round.count({
                where: { number: window.number, isVisible: true },
              })) > 0;

            // Every team's old row goes, including deactivated teams, so
            // nothing stale is left behind if a team is reactivated.
            await tx.round.deleteMany({ where: { number: window.number } });

            for (const entry of schedule.filter(
              (e) => e.round === window.number,
            )) {
              await tx.round.create({
                data: {
                  teamId: entry.teamId,
                  number: entry.round,
                  isVisible: wasVisible,
                  challenges: {
                    create: entry.runs.map((run) => ({
                      name: run.track,
                      time: run.start,
                    })),
                  },
                },
              });
            }
          }
        },
        { timeout: 60_000 },
      );

      const interviewConflicts = await findInterviewConflicts(
        ctx.db,
        teamIds,
        windows,
      );

      // Active teams with no slot in a shifted round (e.g. activated after it
      // was generated). Only a rebuild can give them one.
      const unscheduled =
        toShift.length === 0
          ? []
          : await ctx.db.team.findMany({
              where: {
                isActive: true,
                OR: toShift.map((s) => ({
                  rounds: { none: { number: s.window.number } },
                })),
              },
              select: { name: true },
              orderBy: { name: "asc" },
            });

      return {
        teamsScheduled: teamIds.length,
        rounds: selected.map((w) => w.number),
        shifted: toShift.map((s) => ({
          round: s.window.number,
          minutes: s.deltaMs / MINUTE_MS,
        })),
        rebuilt: toBuild.map((w) => w.number),
        unscheduledTeams: unscheduled.map((team) => team.name),
        // groupsPerRound: Math.ceil(teamIds.length / TEAMS_PER_GROUP),
        minutesPerRound:
          (trackLayout(teamIds.length).segments * SEGMENT_MS) / MINUTE_MS,
        interviewConflicts,
      };
    }),

  /**
   * Replaces the rounds that appear in an uploaded CSV (see ~/lib/schedule-csv)
   * with the times and tracks written in it. Rounds missing from the file are
   * left alone, and a revealed round stays revealed. The whole file is
   * rejected if any row breaks the format or names an unknown team.
   */
  importTrackScheduleCsv: adminProcedure
    .input(trackScheduleInput.extend({ csv: z.string().min(1).max(500_000) }))
    .mutation(async ({ ctx, input }) => {
      const formWindows = toRoundWindows(input);

      let rows: string[][];
      try {
        rows = parseCsv(input.csv.replace(/^\uFEFF/, ""), {
          delimiter: detectDelimiter(input.csv),
          relax_column_count: true,
          skip_empty_lines: true,
        }) as string[][];
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not read the CSV: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      const { runs, errors, warnings } = scheduleFromCsvRows(rows, input.date);

      // Names are matched ignoring case, accents and punctuation.
      const teams = await ctx.db.team.findMany({
        select: { id: true, name: true, isActive: true },
      });
      const byName = new Map<string, (typeof teams)[number] | null>();
      for (const team of teams) {
        const key = normalize(team.name);
        byName.set(key, byName.has(key) ? null : team);
      }
      const teamOf = new Map<string, (typeof teams)[number]>();
      const unknown = new Set<string>();
      for (const run of runs) {
        const team =
          teams.find((t) => t.name.trim() === run.team) ??
          byName.get(normalize(run.team));
        if (team) teamOf.set(run.team, team);
        else unknown.add(run.team);
      }
      if (unknown.size > 0) {
        errors.push(
          `Unknown teams (create them or fix the spelling): ${[...unknown].join(", ")}.`,
        );
      }

      if (errors.length > 0) {
        const shown = errors.slice(0, 10);
        if (errors.length > shown.length) {
          shown.push(`…and ${errors.length - shown.length} more.`);
        }
        throw new TRPCError({ code: "BAD_REQUEST", message: shown.join("\n") });
      }

      const rounds = [...new Set(runs.map((run) => run.round))].sort(
        (a, b) => a - b,
      );
      const byRoundTeam = new Map<string, typeof runs>();
      for (const run of runs) {
        const key = `${run.round}|${teamOf.get(run.team)!.id}`;
        byRoundTeam.set(key, [...(byRoundTeam.get(key) ?? []), run]);
      }

      await ctx.db.$transaction(
        async (tx) => {
          for (const round of rounds) {
            const wasVisible =
              (await tx.round.count({
                where: { number: round, isVisible: true },
              })) > 0;
            await tx.round.deleteMany({ where: { number: round } });

            for (const [key, teamRuns] of byRoundTeam) {
              if (!key.startsWith(`${round}|`)) continue;
              await tx.round.create({
                data: {
                  teamId: teamOf.get(teamRuns[0]!.team)!.id,
                  number: round,
                  isVisible: wasVisible,
                  challenges: {
                    create: teamRuns
                      .sort((a, b) => a.start.getTime() - b.start.getTime())
                      .map((run) => ({ name: run.track, time: run.start })),
                  },
                },
              });
            }
          }
        },
        { timeout: 60_000 },
      );

      const csvTeams = new Set([...teamOf.values()].map((team) => team.id));
      const inactive = teams.filter(
        (team) => !team.isActive && csvTeams.has(team.id),
      );
      if (inactive.length > 0) {
        warnings.push(
          `Inactive teams in the file (hidden until reactivated): ${inactive.map((t) => t.name).join(", ")}.`,
        );
      }
      const missing = teams.filter(
        (team) => team.isActive && !csvTeams.has(team.id),
      );
      if (missing.length > 0) {
        warnings.push(
          `Active teams with no slot in the file: ${missing.map((t) => t.name).join(", ")}.`,
        );
      }

      // Each imported round's window starts at its first run, so "Update
      // Round N times" does not move it, and ends no earlier than its last run.
      const windows = formWindows.map((window) => {
        const times = runs
          .filter((run) => run.round === window.number)
          .map((run) => run.start.getTime());
        if (times.length === 0) return window;
        return {
          number: window.number,
          start: new Date(Math.min(...times)),
          end: new Date(
            Math.max(window.end.getTime(), Math.max(...times) + SEGMENT_MS),
          ),
        };
      });

      const activeIds = teams
        .filter((team) => team.isActive)
        .map((team) => team.id);

      return {
        rounds: rounds.map((round) => ({
          round,
          teams: [...byRoundTeam.keys()].filter((k) =>
            k.startsWith(`${round}|`),
          ).length,
        })),
        windows: windows.map((w) => ({
          number: w.number,
          start: formatTime(w.start),
          end: formatTime(w.end),
        })),
        warnings,
        interviewConflicts: await findInterviewConflicts(
          ctx.db,
          activeIds,
          windows,
        ),
      };
    }),

  /** Stored 2026 schedule as admin tables: one row per group start time. */
  getTrackScheduleTables: adminProcedure.query(async ({ ctx }) => {
    // Inactive teams are read too: they are not listed, but their runs still
    // set the round's span, which is what "Update Round N times" shifts.
    const rounds = await ctx.db.round.findMany({
      select: {
        number: true,
        isVisible: true,
        team: { select: { name: true, isActive: true } },
        challenges: { select: { name: true, time: true } },
      },
    });

    type Row = { time: string; at: number; lanes: Record<string, string[]> };
    const tables = new Map<
      number,
      {
        visible: boolean;
        firstStart: number;
        lastStart: number;
        rows: Map<string, Row>;
      }
    >();

    for (const round of rounds) {
      if (round.challenges.length === 0) continue;
      const table = tables.get(round.number) ?? {
        visible: false,
        firstStart: Infinity,
        lastStart: -Infinity,
        rows: new Map<string, Row>(),
      };
      table.visible ||= round.isVisible;
      tables.set(round.number, table);

      for (const run of round.challenges) {
        table.firstStart = Math.min(table.firstStart, run.time.getTime());
        table.lastStart = Math.max(table.lastStart, run.time.getTime());
      }
      if (!round.team?.isActive) continue;

      for (const run of round.challenges) {
        const lane = /pista\s*([ab]\d?)/i.exec(run.name)?.[1]?.toUpperCase();
        if (!lane) continue;
        const time = formatTime(run.time);
        const row = table.rows.get(time) ?? {
          time,
          at: run.time.getTime(),
          lanes: {},
        };
        (row.lanes[lane] ??= []).push(round.team?.name ?? "");
        table.rows.set(time, row);
      }
    }

    return [...tables.entries()]
      .sort(([a], [b]) => a - b)
      .map(([number, table]) => ({
        number,
        visible: table.visible,
        /** First run start to last run end, in minutes. */
        spanMinutes:
          (table.lastStart + SEGMENT_MS - table.firstStart) / MINUTE_MS,
        rows: [...table.rows.values()].sort((a, b) => a.at - b.at),
      }));
  }),

  // Existing uploadTeamData procedure
  uploadTeamData: adminProcedure.mutation(async ({ ctx }) => {
    const records: string[][] = [];
    const parser = parse({
      delimiter: ",",
    });
    parser.on("readable", function () {
      let record: unknown;
      while ((record = parser.read() as unknown)) {
        const typedRecord = record as string[];
        console.log(typedRecord);
        if (typedRecord[0] === "Nombre") {
          continue;
        }
        records.push(typedRecord);
      }
    });
    // R1_PistaA,R1_PistaB,R1_PistaC,R2_PistaA,R2_PistaB,R2_PistaC,R3_PistaA,R3_PistaB,R3_PistaC
    const filePath = "public/schedule.csv";

    fs.createReadStream(filePath).pipe(parser);

    parser.on("end", function () {
      void (async () => {
        for (const row of records) {
          const teamObject = await ctx.db.team.findFirst({
            where: {
              name: row[0]?.trim() ?? "",
            },
          });

          await ctx.db.round.deleteMany({
            where: {
              teamId: teamObject?.id,
            },
          });

          await ctx.db.round.create({
            data: {
              teamId: teamObject?.id,
              number: 1,
              challenges: {
                create: [
                  { name: "Pista A", time: ComputeDate({ date: row[1] }) },
                  { name: "Pista B", time: ComputeDate({ date: row[2] }) },
                  { name: "Pista C", time: ComputeDate({ date: row[3] }) },
                ],
              },
            },
          });

          await ctx.db.round.create({
            data: {
              teamId: teamObject?.id,
              number: 2,
              challenges: {
                create: [
                  { name: "Pista A", time: ComputeDate({ date: row[4] }) },
                  { name: "Pista B", time: ComputeDate({ date: row[5] }) },
                  { name: "Pista C", time: ComputeDate({ date: row[6] }) },
                ],
              },
            },
          });
          await ctx.db.round.create({
            data: {
              teamId: teamObject?.id,
              number: 3,
              challenges: {
                create: [
                  { name: "Pista A", time: ComputeDate({ date: row[7] }) },
                  { name: "Pista B", time: ComputeDate({ date: row[8] }) },
                  { name: "Pista C", time: ComputeDate({ date: row[9] }) },
                ],
              },
            },
          });
        }
      })();
    });

    return "Finished";
  }),

  regenerateSchedules: adminProcedure
    .input(
      z.object({
        round1StartTime: z.string().default("08:30"),
        round2StartTime: z.string().default("12:30"),
        round3StartTime: z.string().default("16:30"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const activeTeams = await ctx.db.team.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });

      if (activeTeams.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active teams found",
        });
      }

      const { round1StartTime, round2StartTime, round3StartTime } = input;
      const startTimes = [round1StartTime, round2StartTime, round3StartTime];
      const pistaNames = ["Pista A", "Pista B", "Pista C"];
      const challengeNames = ["Challenge 1", "Challenge 2", "Challenge 3"];

      for (const team of activeTeams) {
        await ctx.db.round.deleteMany({
          where: { teamId: team.id },
        });
      }

      for (let round = 1; round <= 3; round++) {
        const startTime = startTimes[round - 1];
        if (!startTime) continue;

        const [startHour, startMinute] = startTime.split(":").map(Number);
        const baseStartMinutes = (startHour ?? 8) * 60 + (startMinute ?? 30);

        for (let challengeIndex = 0; challengeIndex < 3; challengeIndex++) {
          const challengeName = challengeNames[challengeIndex];
          if (!challengeName) continue;

          // Calculate challenge start time based on team count and breaks
          const timePerChallenge = Math.ceil(activeTeams.length / 3) * 6;
          const breakBetweenChallenges = 1; // 1 minute break between challenges

          const challengeStartMinutes =
            challengeIndex === 0
              ? baseStartMinutes // First challenge starts at base time
              : baseStartMinutes +
                challengeIndex * (timePerChallenge + breakBetweenChallenges);

          let currentSlotMinutes = challengeStartMinutes;

          // Create optimal schedule: 3 teams compete simultaneously (one per pista)
          // Calculate how many time slots we need
          const totalTimeSlots = Math.ceil(activeTeams.length / 3);

          for (let slotIndex = 0; slotIndex < totalTimeSlots; slotIndex++) {
            const hour = Math.floor(currentSlotMinutes / 60);
            const minute = currentSlotMinutes % 60;
            const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

            // Assign up to 3 teams for this time slot (one per pista)
            for (let pistaIndex = 0; pistaIndex < 3; pistaIndex++) {
              const teamIndex = slotIndex * 3 + pistaIndex;
              if (teamIndex >= activeTeams.length) break; // No more teams

              const team = activeTeams[teamIndex];
              if (!team) continue;

              // Systematic pista rotation:
              // Round 1: Team starts at pista based on position, then rotates A→B→C
              // Round 2: Team starts at next pista, then rotates B→C→A or C→A→B
              // Round 3: Team starts at next pista, completing the cycle

              // Determine the team's base pista assignment (where they start in Round 1)
              const teamBasePista = teamIndex % 3;

              // Calculate starting pista for this round (shifts by round number)
              const roundStartPista = (teamBasePista + (round - 1)) % 3;

              // Within the round, rotate through challenges
              const finalPistaIndex = (roundStartPista + challengeIndex) % 3;
              const pistaName = pistaNames[finalPistaIndex];
              if (!pistaName) continue;

              // Find or create the round for this team
              let roundRecord = await ctx.db.round.findFirst({
                where: { teamId: team.id, number: round },
              });

              if (!roundRecord) {
                roundRecord = await ctx.db.round.create({
                  data: {
                    teamId: team.id,
                    number: round,
                    isVisible: false, // Will be revealed manually
                  },
                });
              }

              // Create the challenge entry
              await ctx.db.challenge.create({
                data: {
                  roundId: roundRecord.id,
                  name: `${challengeName} - ${pistaName}`,
                  time: ComputeDate({ date: timeString }),
                },
              });
            }

            // Next time slot is 6 minutes later (5 min competition + 1 min transition)
            currentSlotMinutes += 6;
          }
        }
      }

      return {
        success: true,
        teamsScheduled: activeTeams.length,
        tablesGenerated: 9,
      };
    }),

  // Generate schedules for a single specific round only
  generateSingleRound: adminProcedure
    .input(
      z.object({
        roundNumber: z.number().min(1).max(3),
        startTime: z.string().default("08:30"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const activeTeams = await ctx.db.team.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });

      if (activeTeams.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active teams found",
        });
      }

      const { roundNumber, startTime } = input;
      const pistaNames = ["Pista A", "Pista B", "Pista C"];
      const challengeNames = ["Challenge 1", "Challenge 2", "Challenge 3"];

      console.log(
        `Generating single round ${roundNumber} starting at ${startTime}`,
      );

      // Delete existing data for this specific round only
      for (const team of activeTeams) {
        await ctx.db.round.deleteMany({
          where: { teamId: team.id, number: roundNumber },
        });
      }

      const [startHour, startMinute] = startTime.split(":").map(Number);
      const baseStartMinutes = (startHour ?? 8) * 60 + (startMinute ?? 30);

      console.log(
        `Round ${roundNumber}: startTime=${startTime}, parsed=${startHour}:${startMinute}, baseStartMinutes=${baseStartMinutes}`,
      );

      // Create 3 challenges for this specific round
      for (let challengeIndex = 0; challengeIndex < 3; challengeIndex++) {
        const challengeName = challengeNames[challengeIndex];
        if (!challengeName) continue;

        // Calculate challenge start time
        const timePerChallenge = Math.ceil(activeTeams.length / 3) * 6;
        const breakBetweenChallenges = 1;

        const challengeStartMinutes =
          challengeIndex === 0
            ? baseStartMinutes
            : baseStartMinutes +
              challengeIndex * (timePerChallenge + breakBetweenChallenges);

        console.log(
          `Challenge ${challengeIndex + 1}: timePerChallenge=${timePerChallenge}, challengeStartMinutes=${challengeStartMinutes}`,
        );

        let currentSlotMinutes = challengeStartMinutes;
        const totalTimeSlots = Math.ceil(activeTeams.length / 3);

        for (let slotIndex = 0; slotIndex < totalTimeSlots; slotIndex++) {
          const hour = Math.floor(currentSlotMinutes / 60);
          const minute = currentSlotMinutes % 60;
          const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

          console.log(
            `Challenge ${challengeIndex + 1}, Slot ${slotIndex}: currentSlotMinutes=${currentSlotMinutes}, time=${timeString}`,
          );

          for (let pistaIndex = 0; pistaIndex < 3; pistaIndex++) {
            const teamIndex = slotIndex * 3 + pistaIndex;
            if (teamIndex >= activeTeams.length) break;

            const team = activeTeams[teamIndex];
            if (!team) continue;

            // Apply systematic pista rotation
            const teamBasePista = teamIndex % 3;
            const roundStartPista = (teamBasePista + (roundNumber - 1)) % 3;
            const finalPistaIndex = (roundStartPista + challengeIndex) % 3;
            const pistaName = pistaNames[finalPistaIndex];
            if (!pistaName) continue;

            let roundRecord = await ctx.db.round.findFirst({
              where: { teamId: team.id, number: roundNumber },
            });

            if (!roundRecord) {
              roundRecord = await ctx.db.round.create({
                data: {
                  teamId: team.id,
                  number: roundNumber,
                  isVisible: false,
                },
              });
            }

            await ctx.db.challenge.create({
              data: {
                roundId: roundRecord.id,
                name: `${challengeName} - ${pistaName}`,
                time: ComputeDate({ date: timeString }),
              },
            });
          }

          currentSlotMinutes += 6;
        }
      }

      return {
        success: true,
        roundNumber,
        teamsScheduled: activeTeams.length,
        tablesGenerated: 3, // 3 tables for this round
        startTime,
      };
    }),

  getScheduleTables: adminProcedure.query(async ({ ctx }) => {
    const activeTeams = await ctx.db.team.findMany({
      where: { isActive: true },
      include: {
        rounds: {
          include: {
            challenges: true,
          },
          orderBy: { number: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const tables = [];
    const challengeNames = ["Challenge 1", "Challenge 2", "Challenge 3"];

    // Generate 9 table structures
    for (let round = 1; round <= 3; round++) {
      for (let challengeIndex = 0; challengeIndex < 3; challengeIndex++) {
        const challengeName = challengeNames[challengeIndex];

        const timeMap = new Map<
          string,
          { pistaA: string; pistaB: string; pistaC: string }
        >();

        for (const team of activeTeams) {
          const roundData = team.rounds.find((r) => r.number === round);
          if (!roundData) continue;

          const challenge = roundData.challenges.find(
            (c) =>
              c.name.includes(challengeName ?? "") ||
              c.name.includes(`Challenge ${challengeIndex + 1}`),
          );
          if (!challenge) continue;

          const timeKey = challenge.time.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });

          if (!timeMap.has(timeKey)) {
            timeMap.set(timeKey, { pistaA: "", pistaB: "", pistaC: "" });
          }

          const entry = timeMap.get(timeKey)!;

          if (challenge.name.includes("Pista A")) {
            entry.pistaA = team.name;
          } else if (challenge.name.includes("Pista B")) {
            entry.pistaB = team.name;
          } else if (challenge.name.includes("Pista C")) {
            entry.pistaC = team.name;
          }
        }

        // Convert to sorted array
        const sortedTimes = Array.from(timeMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([time, pistas]) => ({
            time,
            ...pistas,
          }));

        tables.push({
          round,
          challenge: challengeIndex + 1,
          challengeName,
          timeSlots: sortedTimes,
        });
      }
    }

    return tables;
  }),
});
