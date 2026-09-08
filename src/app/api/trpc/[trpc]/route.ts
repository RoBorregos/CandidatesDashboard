import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "rbrgs/env";
import { appRouter } from "rbrgs/server/api/root";
import { createTRPCContext } from "rbrgs/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = async (req: NextRequest) => {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

  // tRPC queries go out as GET and carry no cache headers, so browsers may
  // serve identical repeated calls (e.g. polling or a page refresh) straight
  // from the HTTP cache, hiding DB-side changes. Never cache API responses.
  response.headers.set("cache-control", "no-store");
  return response;
};

export { handler as GET, handler as POST };
