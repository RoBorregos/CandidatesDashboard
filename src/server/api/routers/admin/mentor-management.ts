import { z } from "zod";
import { Prisma, Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { CURRENT_EDITION } from "~/lib/registration";

const MENTOR_WHERE = { isMentor: true } as const;

export const mentorManagementRouter = createTRPCRouter({
  getMentors: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: MENTOR_WHERE,
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: { mentorAssignments: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

  setUserMentor: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        isMentor: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          role: true,
          _count: { select: { mentorAssignments: true } },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }

      /*
       * Revoking someone who still has contestants would leave those
       * assignments pointing at a non-mentor. Make the admin clear them first
       * rather than silently orphaning or cascade-deleting them.
       */
      if (!input.isMentor && user._count.mentorAssignments > 0) {
        const count = user._count.mentorAssignments;

        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `This mentor still has ${count} assigned contestant${
            count === 1 ? "" : "s"
          }. Remove the assignment${count === 1 ? "" : "s"} first.`,
        });
      }

      await ctx.db.user.update({
        where: { id: user.id },
        data: { isMentor: input.isMentor },
      });

      return { success: true, isMentor: input.isMentor };
    }),

  getCandidates: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.registrationMember.findMany({
      where: {
        registration: {
          edition: CURRENT_EDITION,
          track: "ADVANCED",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

  getAssignments: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.mentorAssignment.findMany({
      where: {
        OR: [
          {
            registrationMember: {
              registration: { edition: CURRENT_EDITION, track: "ADVANCED" },
            },
          },
          /*
           * No registration to date it against — keep it visible rather than
           * hiding an assignment an admin may still need to remove. Only
           * assignments provably belonging to a past edition are filtered out.
           */
          { registrationMemberId: null },
        ],
      },
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        registrationMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }),

  assignMentor: adminProcedure
    .input(
      z.object({
        mentorId: z.string(),
        userId: z.string().optional(),
        registrationMemberId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hasUser = !!input.userId;
      const hasRegistrationMember = !!input.registrationMemberId;

      // A candidate must be represented by exactly one source.
      if (hasUser === hasRegistrationMember) {
        throw new Error(
          "Provide exactly one candidate: userId or registrationMemberId.",
        );
      }

      const mentor = await ctx.db.user.findFirst({
        where: { id: input.mentorId, ...MENTOR_WHERE },
        select: { id: true },
      });

      if (!mentor) {
        throw new Error("Selected user is not a mentor.");
      }

      /*
       * One person can exist as a RegistrationMember, as a User, or as both.
       * Resolve whichever identity wasn't passed in, so the duplicate check
       * below covers the whole person instead of only the id we happened to
       * receive — otherwise the same candidate could be assigned once by
       * registrationMemberId and again by userId.
       */
      let candidateUserId: string | null = null;
      let candidateRegistrationMemberId: string | null = null;

      // Candidate represented by User
      if (input.userId) {
        const candidate = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: { id: true, role: true },
        });

        if (!candidate) {
          throw new Error("Candidate user not found.");
        }

        if (candidate.role !== Role.CONTESTANT) {
          throw new Error("Selected user is not a contestant.");
        }

        const member = await ctx.db.registrationMember.findFirst({
          where: { userId: candidate.id, edition: CURRENT_EDITION },
          select: { id: true, registration: { select: { track: true } } },
        });

        if (member?.registration.track === "BEGINNER") {
          throw new Error(
            "Beginners are mentored as a team via Mentor Pairs, not individually.",
          );
        }

        candidateUserId = candidate.id;
        candidateRegistrationMemberId = member?.id ?? null;
      }

      // Candidate represented by RegistrationMember
      if (input.registrationMemberId) {
        const candidate = await ctx.db.registrationMember.findUnique({
          where: { id: input.registrationMemberId },
          select: {
            id: true,
            userId: true,
            registration: {
              select: {
                edition: true,
                track: true,
              },
            },
          },
        });

        if (!candidate) {
          throw new Error("Registration member not found.");
        }

        if (candidate.registration.edition !== CURRENT_EDITION) {
          throw new Error("This candidate is not from the current edition.");
        }

        if (candidate.registration.track === "BEGINNER") {
          throw new Error(
            "Beginners are mentored as a team via Mentor Pairs, not individually.",
          );
        }

        candidateUserId = candidate.userId;
        candidateRegistrationMemberId = candidate.id;
      }

      // A candidate can stack several distinct mentors; only reject reassigning the same one.
      const existingAssignment = await ctx.db.mentorAssignment.findFirst({
        where: {
          mentorId: input.mentorId,
          OR: [
            ...(candidateUserId ? [{ userId: candidateUserId }] : []),
            ...(candidateRegistrationMemberId
              ? [{ registrationMemberId: candidateRegistrationMemberId }]
              : []),
          ],
        },
      });

      if (existingAssignment) {
        throw new Error("This mentor is already assigned to this candidate.");
      }

      /*
       * Store both identities. The unique indexes then reject a second
       * assignment for the same person even if two requests race past the
       * check above, or if a later caller passes the other id.
       */
      try {
        return await ctx.db.mentorAssignment.create({
          data: {
            mentorId: input.mentorId,
            userId: candidateUserId,
            registrationMemberId: candidateRegistrationMemberId,
          },
          include: {
            mentor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            registrationMember: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("This mentor is already assigned to this candidate.");
        }

        throw error;
      }
    }),

  removeMentor: adminProcedure
    .input(
      z.object({
        assignmentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.mentorAssignment.delete({
        where: {
          id: input.assignmentId,
        },
      });

      return { success: true };
    }),
});
