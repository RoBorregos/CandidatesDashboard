import { type NextRequest } from "next/server";

import { EVENT_TIME_ZONE } from "~/lib/registration";
import { db } from "~/server/db";
import {
  editionParam,
  rejectUnlessRobot,
  robotJson,
  robotTime,
} from "~/server/robot";

export const dynamic = "force-dynamic";

const teamSchedule = {
  select: {
    name: true,
    // Same rule as the candidate's /team page: unrevealed rounds stay hidden.
    rounds: {
      where: { isVisible: true },
      orderBy: { number: "asc" as const },
      select: {
        number: true,
        challenges: {
          orderBy: { time: "asc" as const },
          select: { name: true, time: true },
        },
      },
    },
  },
};

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

  const edition = editionParam(req.nextUrl.searchParams);
  const member = await db.registrationMember.findFirst({
    where: { id: params.id, edition },
    select: {
      name: true,
      interviewArea: true,
      registration: {
        select: { track: true, challenge: true, team: teamSchedule },
      },
      user: {
        select: {
          interviewTime: true,
          interviewArea: true,
          interviewer: { select: { name: true } },
          team: teamSchedule,
        },
      },
    },
  });
  if (!member) {
    return robotJson({ error: "Candidate not found" }, { status: 404 });
  }

  const user = member.user;
  const team = user?.team ?? member.registration.team;

  return robotJson({
    timezone: EVENT_TIME_ZONE,
    name: member.name,
    track: member.registration.track,
    challenge: member.registration.challenge,
    team: team?.name ?? null,
    interview: user?.interviewTime
      ? {
          ...robotTime(user.interviewTime),
          area: user.interviewArea ?? member.interviewArea,
          interviewer: user.interviewer?.name ?? null,
        }
      : null,
    rounds:
      team?.rounds.map((round) => ({
        round: round.number,
        challenges: round.challenges.map((c) => ({
          track: c.name,
          ...robotTime(c.time),
        })),
      })) ?? [],
  });
}
