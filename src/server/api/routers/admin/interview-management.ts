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
  //  TODO: Fix this function
  scheduleInterview: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        interviewTime: z.date(),
        interviewerId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          team: {
            include: {
              rounds: {
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

      const interviewStart = input.interviewTime;
      const interviewEnd = new Date(interviewStart.getTime() + 15 * 60 * 1000);

      for (const round of user.team.rounds) {
        for (const challenge of round.challenges) {
          const challengeStart = challenge.time;
          const challengeEnd = new Date(
            challengeStart.getTime() + 5 * 60 * 1000,
          );

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

      const conflictingInterview = await ctx.db.user.findFirst({
        where: {
          interviewerId: input.interviewerId,
          interviewTime: {
            gt: new Date(interviewStart.getTime() - 15 * 60 * 1000),
            lt: new Date(interviewStart.getTime() + 15 * 60 * 1000),
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
    .input(z.object({ startTime: z.date(), endTime: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const SLOT_MS = 15 * 60 * 1000;
      const CHALLENGE_MS = 6 * 60 * 1000;

      const toQuarterCeil = (d: Date) => {
        const t = new Date(d);
        const m = t.getMinutes();
        const ceil = Math.ceil(m / 15) * 15;
        t.setMinutes(ceil === 60 ? 0 : ceil, 0, 0);
        if (ceil === 60) t.setHours(t.getHours() + 1);
        return t;
      };
      const toQuarterFloor = (d: Date) => {
        const t = new Date(d);
        const m = t.getMinutes();
        const floor = Math.floor(m / 15) * 15;
        t.setMinutes(floor, 0, 0);
        return t;
      };
      const buildSlots = (start: Date, end: Date) => {
        const slots: Date[] = [];
        let cur = toQuarterCeil(start);
        const lastStart = new Date(toQuarterFloor(end).getTime() - SLOT_MS);
        while (cur <= lastStart) {
          slots.push(new Date(cur));
          cur = new Date(cur.getTime() + SLOT_MS);
        }
        return slots;
      };
      const overlaps = (a1: Date, a2: Date, b1: Date, b2: Date) =>
        !(a2 <= b1 || a1 >= b2);

      const users = await ctx.db.user.findMany({
        where: {
          teamId: { not: null },
          role: { not: "ADMIN" },
          interviewTime: null,
        },
        include: {
          team: { include: { rounds: { include: { challenges: true } } } },
        },
        orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
      });

      const interviewers = await ctx.db.interviewer.findMany();
      const AREAS = ["MECHANICS", "ELECTRONICS", "PROGRAMMING"] as const;

      const interviewersByArea: Record<
        (typeof AREAS)[number],
        { id: string }[]
      > = {
        MECHANICS: interviewers
          .filter((i) => i.area === "MECHANICS")
          .map((i) => ({ id: i.id })),
        ELECTRONICS: interviewers
          .filter((i) => i.area === "ELECTRONICS")
          .map((i) => ({ id: i.id })),
        PROGRAMMING: interviewers
          .filter((i) => i.area === "PROGRAMMING")
          .map((i) => ({ id: i.id })),
      };

      const bookedByInterviewer = new Map<string, Set<number>>();

      const existing = await ctx.db.user.findMany({
        where: { interviewerId: { not: null }, interviewTime: { not: null } },
        select: { interviewerId: true, interviewTime: true },
      });
      for (const row of existing) {
        if (!row.interviewerId || !row.interviewTime) continue;
        const slot = toQuarterFloor(new Date(row.interviewTime)).getTime();
        if (!bookedByInterviewer.has(row.interviewerId)) {
          bookedByInterviewer.set(row.interviewerId, new Set());
        }
        bookedByInterviewer.get(row.interviewerId)!.add(slot);
      }

      const userBusy: Record<string, Array<{ s: Date; e: Date }>> = {};
      for (const u of users) {
        const arr: Array<{ s: Date; e: Date }> = [];
        for (const r of u.team?.rounds ?? []) {
          for (const ch of r.challenges) {
            const s = new Date(ch.time);
            const e = new Date(s.getTime() + CHALLENGE_MS);
            arr.push({ s, e });
          }
        }
        arr.sort((x, y) => x.s.getTime() - y.s.getTime());
        userBusy[u.id] = arr;
      }

      const slots = buildSlots(input.startTime, input.endTime);
      if (slots.length === 0) {
        return {
          success: true,
          scheduledCount: 0,
          message: "No quarter-hour slots in the window.",
        };
      }

      const queueByArea: Record<string, typeof users> = {
        MECHANICS: users.filter((u) => u.interviewArea === "MECHANICS"),
        ELECTRONICS: users.filter((u) => u.interviewArea === "ELECTRONICS"),
        PROGRAMMING: users.filter((u) => u.interviewArea === "PROGRAMMING"),
        UNASSIGNED: users.filter((u) => !u.interviewArea),
      };

      const popNextFreeUser = (arr: typeof users, slotStart: Date) => {
        const slotEnd = new Date(slotStart.getTime() + SLOT_MS);
        for (let i = 0; i < arr.length; i++) {
          const u = arr[i];
          const busy = userBusy[u.id] ?? [];
          const hasConflict = busy.some(({ s, e }) =>
            overlaps(slotStart, slotEnd, s, e),
          );
          if (!hasConflict) {
            arr.splice(i, 1);
            return u;
          }
        }
        return null;
      };

      let scheduledCount = 0;

      for (const slotStart of slots) {
        const slotTs = slotStart.getTime();

        for (const area of AREAS) {
          const areaInterviewers = interviewersByArea[area];
          if (areaInterviewers.length === 0) continue;

          const freeInterviewers: string[] = [];
          for (const iv of areaInterviewers) {
            const booked = bookedByInterviewer.get(iv.id) ?? new Set<number>();
            if (!booked.has(slotTs)) freeInterviewers.push(iv.id);
          }
          if (freeInterviewers.length === 0) continue;

          while (freeInterviewers.length > 0) {
            const user =
              popNextFreeUser(queueByArea[area], slotStart) ??
              popNextFreeUser(queueByArea.UNASSIGNED, slotStart);
            if (!user) break;

            const interviewerId = freeInterviewers.shift()!;
            await ctx.db.user.update({
              where: { id: user.id },
              data: {
                interviewTime: slotStart,
                interviewerId,
                interviewArea: (user.interviewArea ?? area) as
                  | "MECHANICS"
                  | "ELECTRONICS"
                  | "PROGRAMMING",
              },
            });

            // Mark interviewer as booked for this slot
            if (!bookedByInterviewer.has(interviewerId)) {
              bookedByInterviewer.set(interviewerId, new Set<number>());
            }
            bookedByInterviewer.get(interviewerId)!.add(slotTs);

            scheduledCount++;
          }
        }
      }

      return {
        success: true,
        scheduledCount,
        message: `Scheduled ${scheduledCount} interviews on quarter-hour slots without colliding with team challenges.`,
      };
    }),
});
