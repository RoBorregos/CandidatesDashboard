import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  roleProtectionMiddleware,
} from "rbrgs/server/api/trpc";

import { Role } from "@prisma/client";

export const rolesRouter = createTRPCRouter({
  getRole: protectedProcedure.query(async ({ ctx }) => {
    console.log("getRole", ctx.session);
    return ctx.session.user.role;
  }),
  getAdminProtectedMessage: protectedProcedure
    .use(roleProtectionMiddleware([Role.ADMIN]))
    .query(() => {
      return "you can now see this admin protected message!";
    }),
});
