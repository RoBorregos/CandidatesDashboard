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
});
