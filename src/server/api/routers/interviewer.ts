import { protectedProcedure, createTRPCRouter } from "../trpc";

export const interviewerRouter = createTRPCRouter({
  getMyInterviews: protectedProcedure.query(async ({ ctx }) => {
    const email = ctx.session.user?.email;
    if (!email) return [];

    const interviewer = await ctx.db.interviewer.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!interviewer) return [];

    const users = await ctx.db.user.findMany({
      where: {
        interviewerId: interviewer.id,
        interviewTime: { not: null },
      },
      include: {
        team: {
          include: {
            rounds: { include: { challenges: true } },
          },
        },
      },
      orderBy: [{ interviewTime: "asc" }, { name: "asc" }],
    });
    return users;
  }),
  isInterviewer: protectedProcedure.query(async ({ ctx }) => {
    const email = ctx.session.user?.email;
    if (!email) return [];

    const interviewer = await ctx.db.interviewer.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!interviewer) return false;
    return true;
  }),
  isStaff: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user?.id },
    });

    if (!user?.isStaff) return false;
    return true;
  }),
  getMecanicsInterviewers: protectedProcedure.query(async ({ ctx }) => {
    const interviewers = await ctx.db.user.findMany({
      where: { interviewer: { area: "MECHANICS" } },
      include: {
        interviewer: {
          select: { id: true, name: true, area: true, email: true },
        },
        team: {
          include: {
            rounds: { include: { challenges: true } },
          },
        },
      },
      orderBy: [{ interviewTime: "asc" }, { name: "asc" }],
    });
    return interviewers;
  }),
  getElectronicsInterviewers: protectedProcedure.query(async ({ ctx }) => {
    const interviewers = await ctx.db.user.findMany({
      where: { interviewer: { area: "ELECTRONICS" } },
      include: {
        interviewer: {
          select: { id: true, name: true, area: true, email: true },
        },
        team: {
          include: {
            rounds: { include: { challenges: true } },
          },
        },
      },
      orderBy: [{ interviewTime: "asc" }, { name: "asc" }],
    });
    return interviewers;
  }),
  getProgrammingInterviewers: protectedProcedure.query(async ({ ctx }) => {
    const interviewers = await ctx.db.user.findMany({
      where: { interviewer: { area: "PROGRAMMING" } },
      include: {
        interviewer: {
          select: { id: true, name: true, area: true, email: true },
        },
        team: {
          include: {
            rounds: { include: { challenges: true } },
          },
        },
      },
      orderBy: [{ interviewTime: "asc" }, { name: "asc" }],
    });
    return interviewers;
  }),
});
