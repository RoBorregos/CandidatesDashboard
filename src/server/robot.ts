import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { env } from "rbrgs/env";
import { CURRENT_EDITION, EVENT_TIME_ZONE } from "~/lib/registration";

// Shared pieces of the /api/robot endpoints the robot assistant queries.

export function robotJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("cache-control", "no-store");
  return response;
}

/** Returns an error response unless the request carries ROBOT_API_KEY. */
export function rejectUnlessRobot(req: Request): NextResponse | null {
  if (!env.ROBOT_API_KEY) {
    return robotJson({ error: "Robot API disabled" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  const digest = (s: string) => createHash("sha256").update(s).digest();
  if (!timingSafeEqual(digest(token), digest(env.ROBOT_API_KEY))) {
    return robotJson({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function editionParam(params: URLSearchParams): number {
  const edition = Number(params.get("edition"));
  return Number.isInteger(edition) && edition > 0 ? edition : CURRENT_EDITION;
}

const localFormat = new Intl.DateTimeFormat("es-MX", {
  timeZone: EVENT_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** A time both as ISO and as event-local text, so the LLM never converts. */
export function robotTime(date: Date) {
  return { at: date.toISOString(), local: localFormat.format(date) };
}
