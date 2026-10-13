import { type NextRequest } from "next/server";

import { rankNames } from "~/lib/name-match";
import { db } from "~/server/db";
import { editionParam, rejectUnlessRobot, robotJson } from "~/server/robot";

export const dynamic = "force-dynamic";

const TRACKS = ["BEGINNER", "ADVANCED"] as const;

/**
 * GET /api/robot/candidates/search?name=…&track=BEGINNER&limit=3
 *
 * Resolves a transcribed name to registered candidates. `exact: true` means
 * the name pointed at one person; otherwise the robot shows `matches` for the
 * candidate to pick from and then asks /api/robot/candidates/{id}.
 */
export async function GET(req: NextRequest) {
  const denied = rejectUnlessRobot(req);
  if (denied) return denied;

  const params = req.nextUrl.searchParams;
  const name = params.get("name")?.trim();
  if (!name) {
    return robotJson({ error: "Missing name" }, { status: 400 });
  }
  const trackParam = params.get("track")?.toUpperCase();
  const track = TRACKS.find((t) => t === trackParam);
  const limit = Math.min(Math.max(Number(params.get("limit")) || 3, 1), 10);
  const edition = editionParam(params);

  const members = await db.registrationMember.findMany({
    where: {
      edition,
      registration: { edition, ...(track ? { track } : {}) },
    },
    select: {
      id: true,
      name: true,
      user: { select: { team: { select: { name: true } } } },
      registration: { select: { team: { select: { name: true } } } },
    },
  });

  const candidates = members.map((m) => ({
    id: m.id,
    name: m.name,
    team: m.user?.team?.name ?? m.registration.team?.name ?? null,
  }));

  return robotJson({ query: name, ...rankNames(name, candidates, limit) });
}
