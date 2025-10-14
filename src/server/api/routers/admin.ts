import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { parse } from "csv-parse";
import fs from "fs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const adminRouter = createTRPCRouter({
  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      include: {
        team: true,
      },
      orderBy: {
        email: "asc",
      },
    });
  }),

  getAllTeams: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      include: {
        members: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

  getPendingRequests: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.teamRequest.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  assignUserToTeam: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        teamName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { name: input.teamName },
        include: { _count: { select: { members: true } } },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      if (team._count.members >= 4) {
        throw new Error("Team is full. Maximum 4 members allowed.");
      }

      await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          teamId: team.id,
          role: Role.CONTESTANT,
        },
      });

      return { success: true };
    }),

  createTeam: adminProcedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.create({
        data: {
          name: input.name,
        },
      });
    }),

  approveTeamRequest: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.teamRequest.findUnique({
        where: { id: input.requestId },
        include: { user: true },
      });

      if (!request) {
        throw new Error("Request not found");
      }

      const team = await ctx.db.team.findUnique({
        where: { name: request.requestedTeam },
        include: { _count: { select: { members: true } } },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      if (team._count.members >= 4) {
        throw new Error("Team is full");
      }

      await ctx.db.user.update({
        where: { id: request.userId },
        data: {
          teamId: team.id,
          role: Role.CONTESTANT,
        },
      });

      await ctx.db.teamRequest.update({
        where: { id: input.requestId },
        data: { status: "APPROVED" },
      });

      return { success: true };
    }),

  rejectTeamRequest: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.teamRequest.update({
        where: { id: input.requestId },
        data: { status: "REJECTED" },
      });

      return { success: true };
    }),

  removeUserFromTeam: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          teamId: null,
          role: Role.UNASSIGNED,
        },
      });

      return { success: true };
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
          // Create 3 rounds

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

  getTeams: adminProcedure.query(async ({ ctx }) => {
    return await ctx.db.team.findMany({
      include: {
        members: true,
        rounds: {
          include: {
            challenges: true,
          },
          orderBy: {
            number: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

  toggleTeamStatus: adminProcedure
    .input(
      z.object({
        teamId: z.string(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedTeam = await ctx.db.team.update({
        where: { id: input.teamId },
        data: { isActive: input.isActive },
      });

      return {
        success: true,
        team: updatedTeam,
      };
    }),

  getConfig: adminProcedure.query(async ({ ctx }) => {
    try {
      let config = await ctx.db.config.findFirst();

      if (!config) {
        config = await ctx.db.config.create({
          data: {
            freeze: true,
            competitionStarted: false,
            currentRound: 1,
            roundsRevealed: 0,
          },
        });
      }

      return config;
    } catch {
      console.warn("Config table not found, using default configuration");
      return {
        id: 1,
        freeze: true,
        competitionStarted: false,
        currentRound: 1,
        roundsRevealed: 0,
      };
    }
  }),
  updateConfig: adminProcedure
    .input(
      z.object({
        round1StartTime: z.string().optional(),
        round2StartTime: z.string().optional(),
        round3StartTime: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // TODO: review mutation
      return { success: true, config: input };
    }),

  toggleRoundVisibility: adminProcedure
    .input(
      z.object({
        roundNumber: z.number().min(1).max(3),
        isVisible: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log(
        `Toggling round ${input.roundNumber} to ${input.isVisible ? "visible" : "hidden"}`,
      );

      try {
        const updateResult = await ctx.db.round.updateMany({
          where: { number: input.roundNumber },
          data: { isVisible: input.isVisible },
        });

        console.log(`Updated ${updateResult.count} rounds`);

        let config;
        try {
          config = await ctx.db.config.findFirst();
          if (!config) {
            config = await ctx.db.config.create({
              data: {
                freeze: true,
                competitionStarted: false,
                currentRound: 1,
                roundsRevealed: 0,
              },
            });
          }

          const visibleRoundsCount = await ctx.db.round
            .findMany({
              where: { isVisible: true },
              select: { number: true },
              distinct: ["number"],
            })
            .then((rounds) => rounds.length);

          const hasAnyVisible = visibleRoundsCount > 0;

          await ctx.db.config.update({
            where: { id: config.id },
            data: {
              roundsRevealed: visibleRoundsCount,
              competitionStarted: hasAnyVisible,
            },
          });

          console.log(`Config updated: ${visibleRoundsCount} rounds revealed`);
        } catch (configError) {
          console.warn("Config table error (ignoring):", configError);
        }

        return {
          success: true,
          roundNumber: input.roundNumber,
          isVisible: input.isVisible,
          totalRevealed: config
            ? await ctx.db.round.count({ where: { isVisible: true } })
            : 0,
        };
      } catch (error) {
        console.error("Error toggling round visibility:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to ${input.isVisible ? "reveal" : "hide"} round ${input.roundNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  getRoundVisibilityStatus: adminProcedure.query(async ({ ctx }) => {
    try {
      const rounds = await ctx.db.round.findMany({
        select: {
          number: true,
          isVisible: true,
        },
        distinct: ["number"],
      });

      const roundStatus: Record<number, boolean> = {
        1: false,
        2: false,
        3: false,
      };

      rounds.forEach((round) => {
        if (round.isVisible) {
          roundStatus[round.number] = true;
        }
      });

      console.log("Round visibility status:", roundStatus);
      return roundStatus;
    } catch (error) {
      console.error("Error getting round visibility:", error);
      return { 1: false, 2: false, 3: false };
    }
  }),

  revealNextRound: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const visibleRounds = await ctx.db.round.groupBy({
        by: ["number"],
        where: { isVisible: true },
        _count: { number: true },
      });

      const revealedNumbers = visibleRounds.map((r) => r.number).sort();
      let nextRound = 1;

      for (let i = 1; i <= 3; i++) {
        if (!revealedNumbers.includes(i)) {
          nextRound = i;
          break;
        }
      }

      if (revealedNumbers.length >= 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All rounds are already revealed",
        });
      }

      await ctx.db.round.updateMany({
        where: { number: nextRound },
        data: { isVisible: true },
      });

      // Update config
      let config = await ctx.db.config.findFirst();
      if (!config) {
        config = await ctx.db.config.create({
          data: {
            freeze: true,
            competitionStarted: false,
            currentRound: 1,
            roundsRevealed: 0,
          },
        });
      }

      const totalVisible = revealedNumbers.length + 1;
      await ctx.db.config.update({
        where: { id: config.id },
        data: {
          roundsRevealed: totalVisible,
          competitionStarted: true,
        },
      });

      return {
        success: true,
        roundNumber: nextRound,
        isVisible: true,
        totalRevealed: totalVisible,
      };
    } catch (err) {
      console.error("Error revealing next round:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reveal next round",
      });
    }
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
      // Get active teams only
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

  // Test case endpoint - creates sample teams and generates schedules
  runTestCase: adminProcedure.mutation(async ({ ctx }) => {
    // Clear existing test data
    await ctx.db.challenge.deleteMany({});
    await ctx.db.round.deleteMany({});
    await ctx.db.team.deleteMany({
      where: {
        name: {
          in: [
            "Test Team A",
            "Test Team B",
            "Test Team C",
            "Test Team D",
            "Test Team E",
            "Test Team F",
          ],
        },
      },
    });

    // Create 6 test teams
    const testTeams = [];
    const teamNames = [
      "Test Team A",
      "Test Team B",
      "Test Team C",
      "Test Team D",
      "Test Team E",
      "Test Team F",
    ];

    for (const name of teamNames) {
      const team = await ctx.db.team.create({
        data: {
          name,
          isActive: true,
        },
      });
      testTeams.push(team);
    }

    // Generate schedules with test times
    const startTimes = ["08:30", "12:30", "16:30"];
    const pistaNames = ["Pista A", "Pista B", "Pista C"];
    const challengeNames = ["Challenge 1", "Challenge 2", "Challenge 3"];

    // Generate 9 tables: 3 rounds × 3 challenges per round
    for (let round = 1; round <= 3; round++) {
      const startTime = startTimes[round - 1];
      if (!startTime) continue;

      const [startHour, startMinute] = startTime.split(":").map(Number);
      const baseStartMinutes = (startHour ?? 8) * 60 + (startMinute ?? 30);

      // Create 3 challenges for this round
      for (let challengeIndex = 0; challengeIndex < 3; challengeIndex++) {
        const challengeName = challengeNames[challengeIndex];
        if (!challengeName) continue;

        const timePerChallenge = Math.ceil(testTeams.length / 3) * 6;
        const breakBetweenChallenges = 1;

        const challengeStartMinutes =
          challengeIndex === 0
            ? baseStartMinutes
            : baseStartMinutes +
              challengeIndex * (timePerChallenge + breakBetweenChallenges);

        let currentSlotMinutes = challengeStartMinutes;
        const totalTimeSlots = Math.ceil(testTeams.length / 3);

        for (let slotIndex = 0; slotIndex < totalTimeSlots; slotIndex++) {
          const hour = Math.floor(currentSlotMinutes / 60);
          const minute = currentSlotMinutes % 60;
          const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

          for (let pistaIndex = 0; pistaIndex < 3; pistaIndex++) {
            const teamIndex = slotIndex * 3 + pistaIndex;
            if (teamIndex >= testTeams.length) break;

            const team = testTeams[teamIndex];
            if (!team) continue;

            const teamBasePista = teamIndex % 3;
            const roundStartPista = (teamBasePista + (round - 1)) % 3;
            const finalPistaIndex = (roundStartPista + challengeIndex) % 3;
            const pistaName = pistaNames[finalPistaIndex];
            if (!pistaName) continue;

            let roundRecord = await ctx.db.round.findFirst({
              where: { teamId: team.id, number: round },
            });

            if (!roundRecord) {
              roundRecord = await ctx.db.round.create({
                data: {
                  teamId: team.id,
                  number: round,
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
    }

    return {
      success: true,
      message: "Test case executed successfully!",
      teamsCreated: testTeams.length,
      tablesGenerated: 9,
      rotationPattern:
        "Each team follows systematic pista rotation across rounds",
    };
  }),
});

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
