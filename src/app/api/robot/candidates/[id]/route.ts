import { type NextRequest } from "next/server";

import { EVENT_TIME_ZONE } from "~/lib/registration";
import { db } from "~/server/db";
import {
  editionParam,
  interviewSelect,
  langParam,
  notRejected,
  rejectUnlessRobot,
  robotJson,
  serializeInterview,
  serializeRounds,
  teamScheduleSelect,
} from "~/server/robot";

export const dynamic = "force-dynamic";

/**
 * GET /api/robot/candidates/{id}
 *
 * Everything the assistant needs to answer schedule questions for one
 * candidate. `id` is a match id from /api/robot/candidates/search.
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
  const member = await db.registrationMember.findFirst({
    where: { id: params.id, edition, registration: notRejected },
    select: {
      name: true,
      ...interviewSelect,
      registration: { select: { track: true, challenge: true } },
      user: {
        select: {
          ...interviewSelect.user.select,
          team: { select: teamScheduleSelect },
        },
      },
    },
  });
  if (!member) {
    return robotJson({ error: "Candidate not found" }, { status: 404 });
  }

  // Same source as the candidate's /team page and teamMembersWhere.
  const team = member.user?.team;

  return robotJson({
    timezone: EVENT_TIME_ZONE,
    name: member.name,
    track: member.registration.track,
    challenge: member.registration.challenge,
    teamId: team?.id ?? null,
    team: team?.name ?? null,
    interview: serializeInterview(member, lang),
    rounds: serializeRounds(team?.rounds ?? [], lang),
  });
}
