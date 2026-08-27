import { createTRPCRouter, mentorProcedure } from "~/server/api/trpc";
import { CURRENT_EDITION } from "~/lib/registration";

export const mentorRouter = createTRPCRouter({
  getMyPair: mentorProcedure.query(async ({ ctx }) => {
    return ctx.db.mentorPair.findFirst({
      where: {
        edition: CURRENT_EDITION,
        OR: [
          { mentorAId: ctx.session.user.id },
          { mentorBId: ctx.session.user.id },
        ],
      },
      include: {
        mentorA: { select: { id: true, name: true, email: true } },
        mentorB: { select: { id: true, name: true, email: true } },
        teams: {
          include: {
            team: {
              include: {
                members: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    interviewArea: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }),

  // My individually assigned (advanced) candidates.
  getMyAssignments: mentorProcedure.query(async ({ ctx }) => {
    return ctx.db.mentorAssignment.findMany({
      where: { mentorId: ctx.session.user.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        registrationMember: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),
});
