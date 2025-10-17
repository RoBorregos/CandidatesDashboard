import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";

export const staffManagementRouter = createTRPCRouter({
  // Toggle a user's staff status
  setUserStaff: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        isStaff: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { isStaff: input.isStaff },
      });
      return { success: true };
    }),

  // List all staff users (optional helper)
  getStaffUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { isStaff: true },
      orderBy: { email: "asc" },
      select: { id: true, name: true, email: true, image: true, isStaff: true },
    });
  }),

  // Unavailability CRUD
  listUnavailability: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.unavailability.findMany({
        where: { userId: input.userId },
        orderBy: { startMin: "asc" },
      });
    }),

  addUnavailability: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        startMin: z
          .number()
          .int()
          .min(0)
          .max(24 * 60 - 1),
        endMin: z
          .number()
          .int()
          .min(1)
          .max(24 * 60),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.endMin <= input.startMin) {
        throw new Error("End time must be after start time");
      }

      // Optional: prevent overlaps (basic check)
      const overlap = await ctx.db.unavailability.findFirst({
        where: {
          userId: input.userId,
          AND: [
            { startMin: { lt: input.endMin } }, // existing start is before new end
            { endMin: { gt: input.startMin } }, // existing end is after new start
          ],
        },
      });

      if (overlap) {
        // For now, allow overlaps by skipping this error. Uncomment to enforce.
        // throw new Error("Time range overlaps with an existing unavailability");
      }

      const created = await ctx.db.unavailability.create({
        data: {
          userId: input.userId,
          startMin: input.startMin,
          endMin: input.endMin,
        },
      });
      return created;
    }),

  deleteUnavailability: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.unavailability.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
