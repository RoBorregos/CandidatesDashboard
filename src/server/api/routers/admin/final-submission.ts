import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { finalSubmissionOpen } from "~/server/api/routers/upload";
import { getOrCreateConfig } from "./registration-window";

/**
 * Weeks / Final switch. Teams only see (and the server only accepts) uploads
 * for the open side: weeks 2-6 (false) or the shared FINAL submission (true).
 */
export const finalSubmissionRouter = createTRPCRouter({
  getFinalSubmissionOpen: adminProcedure.query(({ ctx }) =>
    finalSubmissionOpen(ctx.db),
  ),

  setFinalSubmissionOpen: adminProcedure
    .input(z.object({ open: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const config = await getOrCreateConfig(ctx.db);
      await ctx.db.config.update({
        where: { id: config.id },
        data: { finalSubmissionOpen: input.open },
      });
      return input.open;
    }),
});
