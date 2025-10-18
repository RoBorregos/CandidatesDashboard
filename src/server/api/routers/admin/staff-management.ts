import { z } from "zod";
import { InterviewArea, job } from "@prisma/client";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";

export const staffManagementRouter = createTRPCRouter({
  // Toggle a user's staff status
  setUserStaff: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        isStaff: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { isStaff: input.isStaff },
      });
      return { success: true };
    }),

  // List all staff users (optional helper)
  getStaffUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { isStaff: true },
      orderBy: { email: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isStaff: true,
        interviewArea: true,
      },
    });
  }),

  setStaffArea: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        area: z.nativeEnum(InterviewArea).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { interviewArea: input.area ?? null },
      });
      return { success: true };
    }),

  // Unavailability CRUD
  listUnavailability: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.unavailability.findMany({
        where: { userId: input.userId },
        orderBy: { startMin: "asc" },
      });
    }),

  addUnavailability: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        startMin: z
          .number()
          .int()
          .min(0)
          .max(24 * 60 - 1),
        endMin: z
          .number()
          .int()
          .min(1)
          .max(24 * 60),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.endMin <= input.startMin) {
        throw new Error("End time must be after start time");
      }

      // Optional: prevent overlaps (basic check)
      const overlap = await ctx.db.unavailability.findFirst({
        where: {
          userId: input.userId,
          AND: [
            { startMin: { lt: input.endMin } }, // existing start is before new end
            { endMin: { gt: input.startMin } }, // existing end is after new start
          ],
        },
      });

      if (overlap) {
        // For now, allow overlaps by skipping this error. Uncomment to enforce.
        // throw new Error("Time range overlaps with an existing unavailability");
      }

      const created = await ctx.db.unavailability.create({
        data: {
          userId: input.userId,
          startMin: input.startMin,
          endMin: input.endMin,
        },
      });
      return created;
    }),

  deleteUnavailability: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.unavailability.delete({ where: { id: input.id } });
      return { success: true };
    }),
  // Staff schedule
  getStaffSchedule: adminProcedure.query(async ({ ctx }) => {
    const assignments = await ctx.db.staffAssignment.findMany({
      orderBy: [{ roundNumber: "asc" }, { job: "asc" }],
      include: {
        user: {
          select: { id: true, name: true, email: true, interviewArea: true },
        },
      },
    });
    return assignments;
  }),

  clearStaffSchedule: adminProcedure
    .input(
      z.object({ rounds: z.array(z.number().int()).optional() }).optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const rounds = input?.rounds ?? [1, 2, 3];
      await ctx.db.staffAssignment.deleteMany({
        where: { roundNumber: { in: rounds } },
      });
      return { success: true };
    }),

  generateStaffSchedule: adminProcedure
    .input(
      z
        .object({
          rounds: z.array(z.number().int()).optional(),
          overwrite: z.boolean().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const rounds = input?.rounds ?? [1, 2, 3];
      const overwrite = input?.overwrite ?? true;

      // Round start minutes (single-day event)
      const roundStartMin: Record<number, number> = {
        1: 8 * 60 + 30,
        2: 13 * 60 + 15,
        3: 16 * 60,
      };

      // Required jobs with counts (at least N per)
      const requiredJobCounts: Array<{ job: job; count: number }> = [
        { job: job.INTERVIEWER_PROGRAMMING, count: 2 }, // two programming interviewers
        { job: job.INTERVIEWER_MECHANICS, count: 1 },
        { job: job.INTERVIEWER_ELECTRONICS, count: 1 },
        { job: job.JUDGE_A, count: 1 },
        { job: job.JUDGE_B, count: 1 },
        { job: job.JUDGE_C, count: 1 },
        { job: job.SUBJUDGE_A, count: 1 },
        { job: job.SUBJUDGE_B, count: 1 },
        { job: job.SUBJUDGE_C, count: 1 },
        { job: job.STREAMING, count: 1 },
      ];

      // Load staff and their unavailability
      const staff = await ctx.db.user.findMany({
        where: { isStaff: true },
        select: {
          id: true,
          name: true,
          email: true,
          interviewArea: true,
          unavailabilities: { select: { startMin: true, endMin: true } },
        },
      });

      // Determine if a user is available for an entire time window [start, end)
      const isAvailableForWindow = (
        u: (typeof staff)[number],
        start: number,
        end: number,
      ) => {
        // Available if there is NO overlap with any unavailability
        return !u.unavailabilities.some(
          (ua) => ua.startMin < end && ua.endMin > start,
        );
      };

      const areaForInterviewerJob = (j: job): InterviewArea | null => {
        if (j === job.INTERVIEWER_PROGRAMMING) return "PROGRAMMING";
        if (j === job.INTERVIEWER_MECHANICS) return "MECHANICS";
        if (j === job.INTERVIEWER_ELECTRONICS) return "ELECTRONICS";
        return null;
      };

      const results: Array<{
        round: number;
        created: number;
        missingJobs: job[];
      }> = [];

      const roundsCreated: Array<{
        round: number;
        created: { userId: string; job: job }[];
        missingJobs: job[];
      }> = [];

      // Round duration is 3 hours 45 minutes (225 minutes)
      const roundDurationMin = 3 * 60 + 45; // 225

      // Precompute end boundaries using fixed duration, clamped to end of day
      const roundEndMin: Record<number, number> = {};
      for (const [rk, start] of Object.entries(roundStartMin)) {
        const rnum = Number(rk);
        roundEndMin[rnum] = Math.min(start + roundDurationMin, 24 * 60);
      }

      for (const r of rounds) {
        const startM = roundStartMin[r];
        const endM = roundEndMin[r];
        if (startM == null || endM == null) continue;

        if (overwrite) {
          await ctx.db.staffAssignment.deleteMany({
            where: { roundNumber: r },
          });
        }

        // Build pool of staff available for the entire round window
        const available = staff.filter((u) =>
          isAvailableForWindow(u, startM, endM),
        );

        const assignments: { userId: string; job: job }[] = [];
        const assignedUserIds = new Set<string>();
        const missingJobs: job[] = [];

        // First pass: ensure at least the required count for each job
        for (const { job: j, count } of requiredJobCounts) {
          const neededArea = areaForInterviewerJob(j);
          let assignedForThisJob = 0;
          for (const u of available) {
            if (assignedForThisJob >= count) break;
            if (assignedUserIds.has(u.id)) continue;
            if (neededArea && u.interviewArea !== neededArea) continue;
            if (
              roundsCreated.some((rc) =>
                rc.created.some((a) => a.userId === u.id && a.job === j),
              )
            )
              continue;
            assignments.push({ userId: u.id, job: j });
            assignedUserIds.add(u.id);
            assignedForThisJob++;
          }
          for (let k = assignedForThisJob; k < count; k++) {
            missingJobs.push(j);
          }
        }

        // Second pass: assign remaining available staff to MISC
        for (const u of available) {
          if (!assignedUserIds.has(u.id)) {
            assignments.push({ userId: u.id, job: job.MISC });
            assignedUserIds.add(u.id);
          }
        }

        // Persist
        if (assignments.length > 0) {
          await ctx.db.staffAssignment.createMany({
            data: assignments.map((a) => ({
              userId: a.userId,
              job: a.job,
              roundNumber: r,
            })),
            skipDuplicates: true,
          });
        }
        roundsCreated.push({ round: r, created: assignments, missingJobs });
        results.push({ round: r, created: assignments.length, missingJobs });
      }

      return { success: true, results };
    }),
});
