import { type NextRequest } from "next/server";

import { rankNames } from "~/lib/name-match";
import { db } from "~/server/db";
import {
  editionParam,
  editionTeams,
  rejectUnlessRobot,
  robotJson,
  teamMembersWhere,
} from "~/server/robot";

export const dynamic = "force-dynamic";

/**
 * GET /api/robot/teams/search?name=…&limit=3
 *
 * Same matching as candidate search, over the edition's active teams.
 */
export async function GET(req: NextRequest) {
  const denied = rejectUnlessRobot(req);
  if (denied) return denied;

  const params = req.nextUrl.searchParams;
  const name = params.get("name")?.trim();
  if (!name) {
    return robotJson({ error: "Missing name" }, { status: 400 });
  }
  const limit = Math.min(Math.max(Number(params.get("limit")) || 3, 1), 10);
  const edition = editionParam(params);

  const { exact, matches } = rankNames(
    name,
    await editionTeams(edition),
    limit,
  );
  const withCounts = await Promise.all(
    matches.map(async (team) => ({
      ...team,
      memberCount: await db.registrationMember.count({
        where: teamMembersWhere(team.id, edition),
      }),
    })),
  );

  return robotJson({ query: name, exact, matches: withCounts });
}
