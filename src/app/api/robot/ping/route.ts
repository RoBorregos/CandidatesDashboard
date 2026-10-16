import { type NextRequest } from "next/server";

import { CURRENT_EDITION } from "~/lib/registration";
import { rejectUnlessRobot, robotJson } from "~/server/robot";

export const dynamic = "force-dynamic";

/** GET /api/robot/ping: lets the robot validate its key at startup. */
export function GET(req: NextRequest) {
  const denied = rejectUnlessRobot(req);
  if (denied) return denied;
  return robotJson({ ok: true, edition: CURRENT_EDITION });
}
