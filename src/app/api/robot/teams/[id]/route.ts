import { type NextRequest } from "next/server";

import { EVENT_TIME_ZONE } from "~/lib/registration";
import { db } from "~/server/db";
import {
  editionParam,
  interviewSelect,
  langParam,
  rejectUnlessRobot,
  robotJson,
  serializeInterview,
  serializeRounds,
  teamMembersWhere,
  teamScheduleSelect,
} from "~/server/robot";

export const dynamic = "force-dynamic";

/**
 * GET /api/robot/teams/{id}
 *
 * A team's round schedule plus each member's interview, shaped like
 * /api/robot/candidates/{id}.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const denied = rejectUnlessRobot(req);
  if (denied) return denied;

  const search = req.nextUrl.searchParams;
  const edition = editionParam(search);
  const lang = langParam(search);

  const [team, members] = await Promise.all([
    db.team.findUnique({
      where: { id: params.id },
      select: teamScheduleSelect,
    }),
    db.registrationMember.findMany({
      where: teamMembersWhere(params.id, edition),
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        ...interviewSelect,
        registration: { select: { track: true, challenge: true } },
      },
    }),
  ]);
  if (!team || members.length === 0) {
    return robotJson({ error: "Team not found" }, { status: 404 });
  }

  // Teams are beginner-track, so every member shares one registration's track.
  const registration = members[0]!.registration;

  return robotJson({
    timezone: EVENT_TIME_ZONE,
    name: team.name,
    track: registration.track,
    challenge: registration.challenge,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      interview: serializeInterview(m, lang),
    })),
    rounds: serializeRounds(team.rounds, lang),
  });
}
