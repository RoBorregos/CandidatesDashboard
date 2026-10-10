import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { parse } from "csv-parse";
import fs from "fs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  buildTrackSchedule,
  competitionTime,
  findScheduleConflicts,
  formatTime,
  INTERVIEW_MS,
  scheduleFromStoredRuns,
  TEAMS_PER_GROUP,
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
   * runs Pista A and Pista B once per round, in groups of four on 2 A + 2 B
   * tracks. The 2025 generators further down are kept but no longer used by
   * the admin dashboard.
   */

  /**
   * (Re)builds the given rounds for every active team with the times in the
   * form. Use it before the event and on the day to shift a delayed round:
   * only the selected rounds are replaced, and a round that was already
   * revealed stays revealed. Returns the interviews that clash with the new
   * times.
   */
  generateTrackSchedule: adminProcedure
    .input(
      trackScheduleInput.extend({
        rounds: z.array(z.number().int().min(1).max(3)).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const windows = toRoundWindows(input);
      const selected = windows.filter((w) => input.rounds.includes(w.number));

      const activeTeams = await ctx.db.team.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true },
      });
      if (activeTeams.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active teams found",
        });
      }
      const teamIds = activeTeams.map((team) => team.id);

      let schedule: TeamRoundSchedule[];
      try {
        schedule = buildTrackSchedule(teamIds, selected);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : String(error),
        });
      }

      await ctx.db.$transaction(
        async (tx) => {
          for (const window of selected) {
            const wasVisible =
              (await tx.round.count({
                where: { number: window.number, isVisible: true },
              })) > 0;

            await tx.round.deleteMany({
              where: { number: window.number, teamId: { in: teamIds } },
            });

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

      // Check the interviews already booked against the whole new schedule.
      const stored = await ctx.db.round.findMany({
        where: { teamId: { in: teamIds } },
        select: { teamId: true, number: true, challenges: true },
      });
      const fullSchedule = stored
        .map((round) =>
          round.teamId
            ? scheduleFromStoredRuns(
                round.teamId,
                round.number,
                round.challenges,
              )
            : null,
        )
        .filter((entry): entry is TeamRoundSchedule => entry !== null);

      const interviewed = await ctx.db.user.findMany({
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

      return {
        teamsScheduled: teamIds.length,
        rounds: selected.map((w) => w.number),
        groupsPerRound: Math.ceil(teamIds.length / TEAMS_PER_GROUP),
        interviewConflicts: conflicts.map((c) => {
          const user = byId.get(c.candidateId);
          return {
            name: user?.name ?? c.candidateId,
            team: user?.team?.name ?? "",
            time: user?.interviewTime ? formatTime(user.interviewTime) : "",
            reason: c.reason,
          };
        }),
      };
    }),

  /** Stored 2026 schedule as admin tables: one row per group start time. */
  getTrackScheduleTables: adminProcedure.query(async ({ ctx }) => {
    const rounds = await ctx.db.round.findMany({
      where: { team: { isActive: true } },
      select: {
        number: true,
        isVisible: true,
        team: { select: { name: true } },
        challenges: { select: { name: true, time: true } },
      },
    });

    type Row = { time: string; at: number; lanes: Record<string, string[]> };
    const tables = new Map<
      number,
      { visible: boolean; rows: Map<string, Row> }
    >();

    for (const round of rounds) {
      const table = tables.get(round.number) ?? {
        visible: false,
        rows: new Map<string, Row>(),
      };
      table.visible ||= round.isVisible;
      tables.set(round.number, table);

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
