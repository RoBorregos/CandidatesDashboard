import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  INTERVIEW_MS,
  INTERVIEW_SLOT_MS,
  assignInterviews,
  findScheduleConflicts,
  formatTime,
  overlaps,
  scheduleFromStoredRuns,
  teamBusyIntervals,
  type Area,
  type TeamRoundSchedule,
} from "~/lib/competition-schedule";

/** Stored runs as the schedule helpers expect them. */
const toSchedule = (
  rounds: {
    teamId: string | null;
    number: number;
    challenges: { name: string; time: Date }[];
  }[],
): TeamRoundSchedule[] =>
  rounds
    .map((round) =>
      round.teamId
        ? scheduleFromStoredRuns(round.teamId, round.number, round.challenges)
        : null,
    )
    .filter((entry): entry is TeamRoundSchedule => entry !== null);

const AREAS_INPUT = z
  .array(z.enum(["MECHANICS", "ELECTRONICS", "PROGRAMMING"]))
  .min(1, "Pick at least one area")
  .transform((areas) => [...new Set(areas)]);

export const interviewManagementRouter = createTRPCRouter({
  getInterviewers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.interviewer.findMany({
      orderBy: { name: "asc" },
    });
  }),

  createInterviewer: adminProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        areas: AREAS_INPUT,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.interviewer.create({
        data: input,
      });
    }),

  setInterviewerAreas: adminProcedure
    .input(z.object({ interviewerId: z.string(), areas: AREAS_INPUT }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.interviewer.update({
        where: { id: input.interviewerId },
        data: { areas: input.areas },
      });
    }),

  deleteInterviewer: adminProcedure
    .input(z.object({ interviewerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Their booked interviews go back to pending so they can be rescheduled.
      const [cleared] = await ctx.db.$transaction([
        ctx.db.user.updateMany({
          where: { interviewerId: input.interviewerId },
          data: { interviewTime: null, interviewerId: null },
        }),
        ctx.db.interviewer.delete({ where: { id: input.interviewerId } }),
      ]);

      return { success: true, clearedInterviews: cleared.count };
    }),

  getInterviewSchedule: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      // Dropped teams are marked inactive; their students aren't interviewed.
      where: {
        team: { isActive: true },
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
      // Earliest interview first; students without one go last, by team.
      orderBy: [
        { interviewTime: { sort: "asc", nulls: "last" } },
        { team: { name: "asc" } },
        { name: "asc" },
      ],
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

      const interview = {
        start: input.interviewTime,
        end: new Date(input.interviewTime.getTime() + INTERVIEW_MS),
      };
      const interviewStart = interview.start;

      // Queue, run and travel time around every run, as the checker sees it.
      const clash = teamBusyIntervals(
        toSchedule(user.team.rounds),
        user.team.id,
      ).find((busy) => overlaps(interview, busy));
      if (clash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `The team is queued, on a track or travelling ${formatTime(clash.start)}–${formatTime(clash.end)}`,
        });
      }

      // The interviewer needs a full slot (interview + tolerance) around it.
      const conflictingInterview = await ctx.db.user.findFirst({
        where: {
          id: { not: input.userId },
          interviewerId: input.interviewerId,
          interviewTime: {
            gt: new Date(interviewStart.getTime() - INTERVIEW_SLOT_MS),
            lt: new Date(interviewStart.getTime() + INTERVIEW_SLOT_MS),
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

  /*
   * Interviews last INTERVIEW_MS (10 min) and start every INTERVIEW_SLOT_MS
   * (10 + 2 min tolerance); each interviewer takes one student per slot. The
   * whole batch is solved at once (see assignInterviews) so that no interview
   * overlaps its team's queue, track or travel time, as many students as
   * possible are placed, and areas only cross when nothing else fits.
   */
  autoScheduleInterviews: adminProcedure
    .input(z.object({ startTime: z.date(), endTime: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const MINUTE_MS = 60 * 1000;

      const users = await ctx.db.user.findMany({
        where: {
          team: { isActive: true },
          role: { not: "ADMIN" },
          interviewTime: null,
        },
        select: { id: true, teamId: true, interviewArea: true },
        orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
      });

      const interviewers = await ctx.db.interviewer.findMany({
        include: {
          users: {
            where: { interviewTime: { not: null } },
            select: { interviewTime: true },
          },
        },
      });
      if (interviewers.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add at least one interviewer before scheduling.",
        });
      }

      const slots: Date[] = [];
      for (
        let t = Math.ceil(input.startTime.getTime() / MINUTE_MS) * MINUTE_MS;
        t + INTERVIEW_MS <= input.endTime.getTime();
        t += INTERVIEW_SLOT_MS
      ) {
        slots.push(new Date(t));
      }
      if (slots.length === 0) {
        return {
          success: true,
          scheduledCount: 0,
          message: "The window is too short for a single interview.",
        };
      }

      const teamIds = [...new Set(users.map((u) => u.teamId!))];
      const schedule = toSchedule(
        await ctx.db.round.findMany({
          where: { teamId: { in: teamIds } },
          select: { teamId: true, number: true, challenges: true },
        }),
      );

      const candidates = users.map((u) => ({
        id: u.id,
        teamId: u.teamId!,
        area: (u.interviewArea as Area | null) ?? null,
      }));
      const { assignments, unassigned } = assignInterviews(
        candidates,
        interviewers.map((iv) => ({
          id: iv.id,
          areas: iv.areas,
          booked: iv.users.map((u) => u.interviewTime!),
        })),
        schedule,
        slots,
      );

      // Never save a batch the checker would flag.
      const conflicts = findScheduleConflicts(
        candidates,
        assignments,
        schedule,
        [{ number: 0, start: input.startTime, end: input.endTime }],
      );
      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Scheduler produced ${conflicts.length} conflict(s); nothing was saved.`,
        });
      }

      const areasOf = new Map(interviewers.map((iv) => [iv.id, iv.areas]));
      const areaOf = new Map(candidates.map((c) => [c.id, c.area]));
      await ctx.db.$transaction(
        assignments.map((a) =>
          ctx.db.user.update({
            where: { id: a.candidateId },
            data: {
              interviewTime: a.start,
              interviewerId: a.interviewerId,
              interviewArea:
                areaOf.get(a.candidateId) ?? areasOf.get(a.interviewerId)![0],
            },
          }),
        ),
      );

      const crossArea = assignments.filter((a) => {
        const area = areaOf.get(a.candidateId);
        return area && !areasOf.get(a.interviewerId)!.includes(area);
      }).length;

      return {
        success: true,
        scheduledCount: assignments.length,
        message:
          `Scheduled ${assignments.length} interviews with no team conflicts ` +
          `(up to ${interviewers.length} at a time).` +
          (crossArea > 0
            ? ` ${crossArea} had to go to an interviewer outside their area.`
            : "") +
          (unassigned.length > 0
            ? ` ${unassigned.length} student(s) could not fit in the window.`
            : ""),
      };
    }),
});
