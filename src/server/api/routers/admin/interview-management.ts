import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const interviewManagementRouter = createTRPCRouter({
  getInterviewers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.interviewer.findMany({
      orderBy: [{ area: "asc" }, { name: "asc" }],
    });
  }),

  createInterviewer: adminProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        area: z.enum(["MECHANICS", "ELECTRONICS", "PROGRAMMING"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.interviewer.create({
        data: input,
      });
    }),

  getInterviewSchedule: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      where: {
        teamId: { not: null },
        role: { not: "ADMIN" },
      },
      include: {
        team: {
          include: {
            rounds: {
              include: { challenges: true },
            },
          },
        },
        interviewer: true,
      },
      orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
    });

    return users;
  }),

  scheduleInterview: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        interviewTime: z.date(),
        interviewerId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check for time conflicts with team's rounds
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          team: {
            include: {
              rounds: {
                // Remove isVisible filter - check ALL rounds for conflicts
                include: { challenges: true },
              },
            },
          },
        },
      });

      if (!user || !user.team) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User must be assigned to a team",
        });
      }

      // Check for conflicts with team schedule
      const interviewStart = input.interviewTime;
      const interviewEnd = new Date(interviewStart.getTime() + 15 * 60 * 1000); // 15 minutes

      for (const round of user.team.rounds) {
        for (const challenge of round.challenges) {
          const challengeStart = challenge.time;
          const challengeEnd = new Date(
            challengeStart.getTime() + 5 * 60 * 1000,
          ); // 5 minutes

          // Check for overlap using improved logic
          const hasOverlap = !(
            interviewEnd <= challengeStart || interviewStart >= challengeEnd
          );

          if (hasOverlap) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Interview time conflicts with ${challenge.name} at ${challengeStart.toLocaleTimeString()}`,
            });
          }
        }
      }

      // Check if interviewer is available at this time
      const conflictingInterview = await ctx.db.user.findFirst({
        where: {
          interviewerId: input.interviewerId,
          interviewTime: {
            gte: new Date(interviewStart.getTime() - 15 * 60 * 1000),
            lte: new Date(interviewStart.getTime() + 15 * 60 * 1000),
          },
        },
      });

      if (conflictingInterview) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Interviewer is not available at this time",
        });
      }

      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          interviewTime: input.interviewTime,
          interviewerId: input.interviewerId,
        },
      });
    }),

  clearInterview: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          interviewTime: null,
          interviewerId: null,
          // Keep interviewArea - it's the user's preference, not scheduling data
        },
      });
    }),

  clearAllInterviews: adminProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.updateMany({
      where: {
        interviewTime: { not: null },
      },
      data: {
        interviewTime: null,
        interviewerId: null,
      },
    });

    return { success: true, message: "All interviews cleared" };
  }),

  autoScheduleInterviews: adminProcedure
    .input(
      z.object({
        startTime: z.date(),
        endTime: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          teamId: { not: null },
          role: { not: "ADMIN" },
          interviewTime: null,
        },
        include: {
          team: {
            include: {
              rounds: {
                // Remove isVisible filter - check ALL rounds for conflicts
                include: { challenges: true },
              },
            },
          },
        },
      });

      const interviewers = await ctx.db.interviewer.findMany();
      const areas = ["MECHANICS", "ELECTRONICS", "PROGRAMMING"] as const;

      let currentTime = new Date(input.startTime);
      const endTime = new Date(input.endTime);
      let scheduledCount = 0;

      // Group users by their preferred area
      const usersByArea = {
        MECHANICS: users.filter((u) => u.interviewArea === "MECHANICS"),
        ELECTRONICS: users.filter((u) => u.interviewArea === "ELECTRONICS"),
        PROGRAMMING: users.filter((u) => u.interviewArea === "PROGRAMMING"),
        UNASSIGNED: users.filter((u) => !u.interviewArea),
      };

      // Helper function to check if user has schedule conflict at given time
      const hasScheduleConflict = (
        user: (typeof users)[0],
        interviewTime: Date,
      ) => {
        if (!user.team) return false;

        const interviewEnd = new Date(interviewTime.getTime() + 15 * 60 * 1000);

        console.log(
          `\nChecking conflicts for user ${user.name ?? user.email} (Team ${user.team.name}):`,
        );
        console.log(
          `  Proposed interview: ${interviewTime.toLocaleString()} - ${interviewEnd.toLocaleString()}`,
        );
        console.log(
          `  Interview UTC: ${interviewTime.toISOString()} - ${interviewEnd.toISOString()}`,
        );
        console.log(`  Team has ${user.team.rounds.length} visible rounds`);

        for (const round of user.team.rounds) {
          console.log(
            `  Checking Round ${round.number} (${round.challenges.length} challenges):`,
          );
          for (const challenge of round.challenges) {
            const challengeStart = challenge.time;
            const challengeEnd = new Date(
              challengeStart.getTime() + 5 * 60 * 1000,
            );

            console.log(`    Challenge ${challenge.name}:`);
            console.log(
              `       Local: ${challengeStart.toLocaleString()} - ${challengeEnd.toLocaleString()}`,
            );
            console.log(
              `       UTC: ${challengeStart.toISOString()} - ${challengeEnd.toISOString()}`,
            );

            // More explicit overlap detection
            const hasOverlap = !(
              interviewEnd <= challengeStart || interviewTime >= challengeEnd
            );

            console.log(
              `       Overlap check: !(${interviewEnd.toISOString()} <= ${challengeStart.toISOString()} || ${interviewTime.toISOString()} >= ${challengeEnd.toISOString()})`,
            );
            console.log(`       Has overlap: ${hasOverlap}`);

            if (hasOverlap) {
              console.log(
                ` CONFLICT DETECTED for user ${user.id} (${user.name ?? user.email}):`,
              );
              console.log(
                `  Interview: ${interviewTime.toLocaleString()} - ${interviewEnd.toLocaleString()}`,
              );
              console.log(
                `  Challenge: ${challengeStart.toLocaleString()} - ${challengeEnd.toLocaleString()}`,
              );
              return true;
            }
          }
        }
        console.log(`No conflicts found for user ${user.name ?? user.email}`);
        return false;
      };

      // Helper function to get available interviewers for an area at given time
      const getAvailableInterviewers = async (
        area: string,
        interviewTime: Date,
      ) => {
        const areaInterviewers = interviewers.filter((i) => i.area === area);
        const availableInterviewers = [];

        for (const interviewer of areaInterviewers) {
          // Check if interviewer is busy at this time (±15 minutes)
          const conflictingInterview = await ctx.db.user.findFirst({
            where: {
              interviewerId: interviewer.id,
              interviewTime: {
                gte: new Date(interviewTime.getTime() - 15 * 60 * 1000),
                lte: new Date(interviewTime.getTime() + 15 * 60 * 1000),
              },
            },
          });

          if (!conflictingInterview) {
            availableInterviewers.push(interviewer);
          }
        }

        return availableInterviewers;
      };

      // Main scheduling loop - 15-minute time slots
      while (currentTime < endTime && scheduledCount < users.length) {
        let slotsScheduledThisRound = 0;

        // Try to schedule in each area simultaneously
        for (const area of [...areas, "UNASSIGNED"]) {
          const usersInArea = usersByArea[area as keyof typeof usersByArea];
          if (usersInArea.length === 0) continue;

          // Get available interviewers for this area
          let availableInterviewers;
          if (area === "UNASSIGNED") {
            // For unassigned users, try any area that has availability
            let bestArea = null;
            let maxAvailable = 0;

            for (const testArea of areas) {
              const available = await getAvailableInterviewers(
                testArea,
                currentTime,
              );
              if (available.length > maxAvailable) {
                maxAvailable = available.length;
                bestArea = testArea;
                availableInterviewers = available;
              }
            }

            if (!bestArea || !availableInterviewers) continue;
          } else {
            availableInterviewers = await getAvailableInterviewers(
              area,
              currentTime,
            );
          }

          if (availableInterviewers.length === 0) continue;

          // Schedule up to the number of available interviewers
          const usersToSchedule = usersInArea
            .filter((user) => !hasScheduleConflict(user, currentTime))
            .slice(0, availableInterviewers.length);

          for (
            let i = 0;
            i < usersToSchedule.length && i < availableInterviewers.length;
            i++
          ) {
            const user = usersToSchedule[i];
            const interviewer = availableInterviewers[i];

            if (!user || !interviewer) continue;

            try {
              await ctx.db.user.update({
                where: { id: user.id },
                data: {
                  interviewTime: currentTime,
                  interviewArea:
                    area === "UNASSIGNED"
                      ? (interviewer.area as
                          | "MECHANICS"
                          | "ELECTRONICS"
                          | "PROGRAMMING")
                      : (area as "MECHANICS" | "ELECTRONICS" | "PROGRAMMING"),
                  interviewerId: interviewer.id,
                },
              });

              // Remove user from the pool
              const userArray = usersByArea[area as keyof typeof usersByArea];
              const userIndex = userArray.findIndex((u) => u.id === user.id);
              if (userIndex > -1) {
                userArray.splice(userIndex, 1);
              }

              scheduledCount++;
              slotsScheduledThisRound++;
            } catch (error) {
              console.error("Error scheduling interview:", error);
            }
          }
        }

        // Move to next time slot (15 minutes later)
        currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);

        // If no interviews were scheduled in this round and we still have users,
        // it might be due to schedule conflicts, so continue to next time slot
        if (slotsScheduledThisRound === 0 && scheduledCount < users.length) {
          // Skip ahead if we're in a period of heavy schedule conflicts
          const remainingUsers = Object.values(usersByArea).flat().length;
          if (remainingUsers > 0) {
            // Continue to next slot
            continue;
          } else {
            // All users processed
            break;
          }
        }
      }

      return {
        success: true,
        scheduledCount,
        message: `Successfully scheduled ${scheduledCount} interviews using parallel scheduling`,
      };
    }),
});
