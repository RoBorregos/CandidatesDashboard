import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  roleProtectionMiddleware,
} from "~/server/api/trpc";
import { UserRole } from "~/util/UserRole";

export const rolesRouter = createTRPCRouter({
  getRole: protectedProcedure.query(async ({ ctx }) => {
    console.log('getRole', ctx.session)
    return ctx.session.user.role;
  }),
  getAdminProtectedMessage: protectedProcedure.use(roleProtectionMiddleware(UserRole.ADMIN)).query(() => {
    return "you can now see this admin protected message!";
  }),
})

