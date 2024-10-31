import { postRouter } from "rbrgs/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "rbrgs/server/api/trpc";
import { rolesRouter } from "rbrgs/server/api/routers/roles";
import { teamRouter } from "rbrgs/server/api/routers/team";
import { judgeRouter } from "rbrgs/server/api/routers/judge";
import { scoreboardRouter } from "./routers/scoreboard";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  roles: rolesRouter,
  team: teamRouter,
  judge: judgeRouter,
  scoreboard: scoreboardRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
