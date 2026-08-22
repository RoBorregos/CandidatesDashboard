import { z } from "zod";
import { Role } from "@prisma/client";
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

        const existingAssignment =
          await ctx.db.mentorAssignment.findUnique({
            where: { userId: input.userId },
          });

        if (existingAssignment) {
          throw new Error("This candidate already has a mentor.");
        }
      }

      // Candidate represented by RegistrationMember
      if (input.registrationMemberId) {
        const candidate = await ctx.db.registrationMember.findUnique({
          where: { id: input.registrationMemberId },
          select: {
            id: true,
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

        const existingAssignment =
          await ctx.db.mentorAssignment.findUnique({
            where: {
              registrationMemberId: input.registrationMemberId,
            },
          });

        if (existingAssignment) {
          throw new Error("This candidate already has a mentor.");
        }
      }

      return ctx.db.mentorAssignment.create({
        data: {
          mentorId: input.mentorId,
          userId: input.userId,
          registrationMemberId: input.registrationMemberId,
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