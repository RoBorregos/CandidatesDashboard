import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { InterviewArea } from "@prisma/client";

import { env } from "rbrgs/env";
import {
  AREA_LABELS,
  CURRENT_EDITION,
  EVENT_TIME_ZONE,
} from "~/lib/registration";
import { db } from "~/server/db";

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

export type RobotLang = "es" | "en";

/** `lang=en` switches every human-readable string to English. */
export function langParam(params: URLSearchParams): RobotLang {
  return params.get("lang")?.toLowerCase() === "en" ? "en" : "es";
}

/** Fuzzy matches below this are too far off to narrow a search by. */
export const MIN_MATCH_SCORE = 0.6;

const localFormats: Record<RobotLang, Intl.DateTimeFormat> = {
  // "jueves 15 de oct, 10:30"
  es: new Intl.DateTimeFormat("es-MX", {
    timeZone: EVENT_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }),
  // "Thursday, October 15 at 10:30 AM"
  en: new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }),
};

/** A time both as ISO and as event-local text, so the LLM never converts. */
export function robotTime(date: Date, lang: RobotLang) {
  return { at: date.toISOString(), local: localFormats[lang].format(date) };
}

const AREA_LABELS_EN: Record<InterviewArea, string> = {
  PROGRAMMING: "Programming",
  MECHANICS: "Mechanics",
  ELECTRONICS: "Electronics",
};

function areaLabel(area: InterviewArea | null, lang: RobotLang) {
  if (!area) return null;
  return (lang === "en" ? AREA_LABELS_EN : AREA_LABELS)[area];
}

/** Round slots are stored as "Pista A/B/C". */
function trackLabel(name: string, lang: RobotLang) {
  return lang === "en" ? name.replace(/^Pista\b/i, "Track") : name;
}

/** Prisma select for a team's revealed round schedule. */
export const teamScheduleSelect = {
  id: true,
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
};

type ScheduleRound = {
  number: number;
  challenges: { name: string; time: Date }[];
};

export function serializeRounds(rounds: ScheduleRound[], lang: RobotLang) {
  return rounds.map((round) => ({
    round: round.number,
    challenges: round.challenges.map((c) => ({
      track: trackLabel(c.name, lang),
      ...robotTime(c.time, lang),
      // No room is stored per slot yet.
      location: null,
    })),
  }));
}

/** Prisma select for a registration member's interview. */
export const interviewSelect = {
  interviewArea: true,
  user: {
    select: {
      interviewTime: true,
      interviewArea: true,
      interviewer: { select: { name: true } },
    },
  },
};

type InterviewSource = {
  interviewArea: InterviewArea | null;
  user: {
    interviewTime: Date | null;
    interviewArea: InterviewArea | null;
    interviewer: { name: string } | null;
  } | null;
};

export function serializeInterview(member: InterviewSource, lang: RobotLang) {
  const user = member.user;
  if (!user?.interviewTime) return null;
  const area = user.interviewArea ?? member.interviewArea;
  return {
    ...robotTime(user.interviewTime, lang),
    area,
    areaLabel: areaLabel(area, lang),
    interviewer: user.interviewer?.name ?? null,
    // No room is stored per interview yet.
    location: null,
  };
}

/**
 * Members of a team in an edition: whoever registered with it, plus whoever
 * joined it from the dashboard after registering.
 */
export function teamMembersWhere(teamId: string, edition: number) {
  return {
    edition,
    OR: [{ registration: { teamId } }, { user: { teamId } }],
  };
}

/** Active teams with at least one member registered in the edition. */
export async function editionTeams(edition: number) {
  return db.team.findMany({
    where: {
      isActive: true,
      OR: [
        { registrations: { some: { edition } } },
        { members: { some: { registrationMembers: { some: { edition } } } } },
      ],
    },
    select: { id: true, name: true },
  });
}
