import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { advancedDueAt } from "~/server/api/routers/advanced-submission";
import { getOrCreateConfig } from "./registration-window";

/**
 * The advanced track's hand-in deadline. Past it candidates can't change
 * their submission, and anything stamped after it shows as late.
 */
export const advancedDeadlineRouter = createTRPCRouter({
  getAdvancedDeadline: adminProcedure.query(async ({ ctx }) => {
    return advancedDueAt(ctx.db);
  }),

  setAdvancedDeadline: adminProcedure
    .input(z.object({ dueAt: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const config = await getOrCreateConfig(ctx.db);
      await ctx.db.config.update({
        where: { id: config.id },
        data: { advancedSubmissionDueAt: input.dueAt },
      });
      return input.dueAt;
    }),
});
