import { Role } from "@prisma/client";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { resolveRegistrationWindow } from "~/lib/registration";

export const configRouter = createTRPCRouter({
  registrationWindow: publicProcedure.query(async ({ ctx }) => {
    const config = await ctx.db.config.findFirst({
      select: {
        registrationClosesAt: true,
        registrationOverride: true,
        registrationOverrideUntil: true,
      },
    });
    return resolveRegistrationWindow(config);
  }),

  isCompetitionStarted: publicProcedure.query(async ({ ctx }) => {
    const config = await ctx.db.config.findFirst();
    return config?.competitionStarted ?? false;
  }),

  isScoreboardFrozen: publicProcedure.query(async ({ ctx }) => {
    const config = await ctx.db.config.findFirst();
    const isAdmin = ctx.session?.user.role == Role.ADMIN;
    if (isAdmin) {
      return false;
    }
    return config?.freeze ?? false;
  }),
});
