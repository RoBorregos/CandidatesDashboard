import { z } from "zod";
import { Prisma, Role } from "@prisma/client";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { CURRENT_EDITION } from "~/lib/registration";

export const mentorManagementRouter = createTRPCRouter({
  getMentors: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: {
        role: Role.MENTOR,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

  getCandidates: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.registrationMember.findMany({
      where: {
        registration: {
          edition: CURRENT_EDITION,
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

      // Verify the mentor exists and actually has the mentor role.
      const mentor = await ctx.db.user.findUnique({
        where: { id: input.mentorId },
        select: { id: true, role: true },
      });

      if (!mentor) {
        throw new Error("Mentor not found.");
      }

      if (mentor.role !== Role.MENTOR) {
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
          select: { id: true },
        });

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

        candidateUserId = candidate.userId;
        candidateRegistrationMemberId = candidate.id;
      }

      const existingAssignment = await ctx.db.mentorAssignment.findFirst({
        where: {
          OR: [
            ...(candidateUserId ? [{ userId: candidateUserId }] : []),
            ...(candidateRegistrationMemberId
              ? [{ registrationMemberId: candidateRegistrationMemberId }]
              : []),
          ],
        },
      });

      if (existingAssignment) {
        throw new Error("This candidate already has a mentor.");
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
        // A concurrent assignment won the race against the check above.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("This candidate already has a mentor.");
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