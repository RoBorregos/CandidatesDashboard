/*
 * Competition-day schedule: track runs per round and individual interviews.
 *
 * Structure, from "Reto Candidates Principiantes 2026" and the committee's
 * day plan (Sat 17 Oct 2026, Mexico City time):
 *
 *   - Three rounds. In every round each team runs Pista A and Pista B once,
 *     so a round is two 8-minute segments per team (2 min calibration + 6 min
 *     run).
 *   - There are four tracks: two A and two B. Teams go out in groups of four
 *     that start together: two teams on the A tracks and two on the B tracks,
 *     then they swap. A group therefore takes two segments (16 min).
 *   - The next group must already be in line when the previous one starts,
 *     so a team is busy from the previous group's start until its own
 *     second segment ends.
 *   - Individual interviews can only happen inside the three round windows,
 *     never while the candidate's team is queued or on a track.
 *
 * Everything here is pure (no database access) so the admin routers, the
 * seed script and tests can share it.
 */

/** Time zone every time in this file is written in. */
export const COMPETITION_TIME_ZONE = "America/Mexico_City";

/**
 * Mexico City has no daylight saving since 2022, so -06:00 holds all year
 * and the offset can be written explicitly instead of relying on a zone name.
 */
const CDMX_OFFSET = "-06:00";

/** Competition day, as YYYY-MM-DD in Mexico City. */
export const COMPETITION_DATE = "2026-10-17";

export const MINUTE_MS = 60 * 1000;

/** One run on one track: 2 min calibration + 6 min round. */
export const SEGMENT_MS = 8 * MINUTE_MS;

/** Each team runs Pista A and Pista B once per round. */
export const SEGMENTS_PER_ROUND = 2;

/** Teams that start at the same time (two A tracks + two B tracks). */
export const TEAMS_PER_GROUP = 4;

/** A group runs both of its segments back to back. */
export const GROUP_MS = SEGMENTS_PER_ROUND * SEGMENT_MS;

/** Length of an individual interview. */
export const INTERVIEW_MS = 15 * MINUTE_MS;

/** Interviews start on this grid (quarter hours). */
export const INTERVIEW_SLOT_MS = 15 * MINUTE_MS;

/** Time to walk from the track back to the interview room. */
export const TRAVEL_BUFFER_MS = 5 * MINUTE_MS;

export const TRACKS = {
  A: ["Pista A1", "Pista A2"],
  B: ["Pista B1", "Pista B2"],
} as const;

/** Builds a Date for an HH:MM time on competition day, in Mexico City time. */
export function competitionTime(
  hhmm: string,
  date: string = COMPETITION_DATE,
): Date {
  return new Date(`${date}T${hhmm}:00${CDMX_OFFSET}`);
}

export type RoundWindow = { number: number; start: Date; end: Date };

/** Round windows from the committee's day plan. */
export function roundWindows(date: string = COMPETITION_DATE): RoundWindow[] {
  return [
    {
      number: 1,
      start: competitionTime("10:00", date),
      end: competitionTime("13:00", date),
    },
    {
      number: 2,
      start: competitionTime("14:00", date),
      end: competitionTime("17:00", date),
    },
    {
      number: 3,
      start: competitionTime("17:00", date),
      end: competitionTime("20:00", date),
    },
  ];
}

export type Interval = { start: Date; end: Date };

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export type TrackRun = {
  teamId: string;
  round: number;
  /** 0-based position of the team's group within the round. */
  group: number;
  /** "Pista A1", "Pista B2", ... */
  track: string;
  start: Date;
  end: Date;
};

export type TeamRoundSchedule = {
  teamId: string;
  round: number;
  group: number;
  runs: TrackRun[];
  /** From the moment the team has to be in line until its last run ends. */
  busy: Interval;
};

/**
 * Splits the teams into groups of four and lays out both segments of every
 * round. Within a group the first two teams start on the A tracks and the
 * last two on the B tracks, then they swap.
 *
 * Throws if the groups do not fit inside a round window.
 */
export function buildTrackSchedule(
  teamIds: string[],
  windows: RoundWindow[] = roundWindows(),
): TeamRoundSchedule[] {
  const groupCount = Math.ceil(teamIds.length / TEAMS_PER_GROUP);
  const schedule: TeamRoundSchedule[] = [];

  for (const window of windows) {
    const needed = groupCount * GROUP_MS;
    const available = window.end.getTime() - window.start.getTime();
    if (needed > available) {
      throw new Error(
        `Round ${window.number}: ${groupCount} groups need ${needed / MINUTE_MS} min but the window only has ${available / MINUTE_MS} min.`,
      );
    }

    teamIds.forEach((teamId, index) => {
      const group = Math.floor(index / TEAMS_PER_GROUP);
      const seat = index % TEAMS_PER_GROUP;
      const groupStart = window.start.getTime() + group * GROUP_MS;

      // Seats 0-1 go A then B, seats 2-3 go B then A; seat parity picks
      // which of the two tracks of each kind.
      const lane = seat % 2;
      const order = seat < 2 ? (["A", "B"] as const) : (["B", "A"] as const);

      const runs: TrackRun[] = order.map((kind, segment) => {
        const start = new Date(groupStart + segment * SEGMENT_MS);
        return {
          teamId,
          round: window.number,
          group,
          track: TRACKS[kind][lane]!,
          start,
          end: new Date(start.getTime() + SEGMENT_MS),
        };
      });

      // In line from the previous group's start (the first group lines up
      // before the round opens, which is outside any interview window).
      const queueFrom = Math.max(
        window.start.getTime(),
        groupStart - GROUP_MS,
      );

      schedule.push({
        teamId,
        round: window.number,
        group,
        runs,
        busy: {
          start: new Date(queueFrom),
          end: new Date(groupStart + GROUP_MS),
        },
      });
    });
  }

  return schedule;
}

/**
 * Rebuilds the schedule of one stored round (its track runs from the
 * database) so it can be checked like a freshly generated one. The queue
 * time is taken as one group before the first run.
 */
export function scheduleFromStoredRuns(
  teamId: string,
  round: number,
  runs: { name: string; time: Date }[],
): TeamRoundSchedule | null {
  if (runs.length === 0) return null;
  const starts = runs.map((run) => new Date(run.time).getTime());
  const first = Math.min(...starts);
  const last = Math.max(...starts) + SEGMENT_MS;
  return {
    teamId,
    round,
    group: -1,
    runs: runs.map((run) => {
      const start = new Date(run.time);
      return {
        teamId,
        round,
        group: -1,
        track: run.name,
        start,
        end: new Date(start.getTime() + SEGMENT_MS),
      };
    }),
    busy: { start: new Date(first - GROUP_MS), end: new Date(last) },
  };
}

/** Intervals in which a team's members cannot be interviewed. */
export function teamBusyIntervals(
  schedule: TeamRoundSchedule[],
  teamId: string,
  travelBufferMs: number = TRAVEL_BUFFER_MS,
): Interval[] {
  return schedule
    .filter((entry) => entry.teamId === teamId)
    .map((entry) => ({
      start: new Date(entry.busy.start.getTime() - travelBufferMs),
      end: new Date(entry.busy.end.getTime() + travelBufferMs),
    }));
}

export type Area = "MECHANICS" | "ELECTRONICS" | "PROGRAMMING";

export type Candidate = { id: string; teamId: string; area: Area | null };
export type InterviewerSlot = { id: string; area: Area };

export type InterviewAssignment = {
  candidateId: string;
  interviewerId: string;
  start: Date;
  end: Date;
};

/** Quarter-hour interview start times that fit inside the round windows. */
export function interviewSlots(
  windows: RoundWindow[] = roundWindows(),
): Date[] {
  const slots: Date[] = [];
  for (const window of windows) {
    for (
      let t = window.start.getTime();
      t + INTERVIEW_MS <= window.end.getTime();
      t += INTERVIEW_SLOT_MS
    ) {
      slots.push(new Date(t));
    }
  }
  return slots;
}

/**
 * Greedy, chronological assignment: at every slot each free interviewer takes
 * the first waiting candidate of their area (or one with no area) whose team
 * is not queued or on a track.
 */
export function assignInterviews(
  candidates: Candidate[],
  interviewers: InterviewerSlot[],
  schedule: TeamRoundSchedule[],
  windows: RoundWindow[] = roundWindows(),
): { assignments: InterviewAssignment[]; unassigned: Candidate[] } {
  const busyByTeam = new Map<string, Interval[]>();
  const busyFor = (teamId: string) => {
    let busy = busyByTeam.get(teamId);
    if (!busy) {
      busy = teamBusyIntervals(schedule, teamId);
      busyByTeam.set(teamId, busy);
    }
    return busy;
  };

  const waiting = [...candidates];
  const assignments: InterviewAssignment[] = [];

  for (const slotStart of interviewSlots(windows)) {
    const slot = {
      start: slotStart,
      end: new Date(slotStart.getTime() + INTERVIEW_MS),
    };

    for (const interviewer of interviewers) {
      const index = waiting.findIndex(
        (candidate) =>
          (candidate.area === interviewer.area || candidate.area === null) &&
          !busyFor(candidate.teamId).some((busy) => overlaps(slot, busy)),
      );
      if (index === -1) continue;

      const [candidate] = waiting.splice(index, 1);
      assignments.push({
        candidateId: candidate!.id,
        interviewerId: interviewer.id,
        ...slot,
      });
    }
  }

  return { assignments, unassigned: waiting };
}

export type ScheduleConflict = { candidateId: string; reason: string };

/**
 * Independent check of a finished schedule, so it also catches assignments
 * made by hand or by an older algorithm:
 *   - interview outside every round window,
 *   - interview overlapping the team's queue/track time (plus travel buffer),
 *   - interviewer booked twice at once,
 *   - candidate interviewed more than once.
 */
export function findScheduleConflicts(
  candidates: Candidate[],
  assignments: InterviewAssignment[],
  schedule: TeamRoundSchedule[],
  windows: RoundWindow[] = roundWindows(),
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const teamOf = new Map(candidates.map((c) => [c.id, c.teamId]));
  const seen = new Set<string>();

  for (const assignment of assignments) {
    const { candidateId } = assignment;

    if (seen.has(candidateId)) {
      conflicts.push({ candidateId, reason: "interviewed more than once" });
    }
    seen.add(candidateId);

    const insideWindow = windows.some(
      (w) => assignment.start >= w.start && assignment.end <= w.end,
    );
    if (!insideWindow) {
      conflicts.push({ candidateId, reason: "outside the round windows" });
    }

    const teamId = teamOf.get(candidateId);
    if (!teamId) {
      conflicts.push({ candidateId, reason: "candidate has no team" });
      continue;
    }

    const clash = teamBusyIntervals(schedule, teamId).find((busy) =>
      overlaps(assignment, busy),
    );
    if (clash) {
      conflicts.push({
        candidateId,
        reason: `overlaps the team's track time (${formatTime(clash.start)}–${formatTime(clash.end)})`,
      });
    }
  }

  const byInterviewer = new Map<string, InterviewAssignment[]>();
  for (const assignment of assignments) {
    const list = byInterviewer.get(assignment.interviewerId) ?? [];
    list.push(assignment);
    byInterviewer.set(assignment.interviewerId, list);
  }
  for (const list of byInterviewer.values()) {
    list.sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 1; i < list.length; i++) {
      if (overlaps(list[i - 1]!, list[i]!)) {
        conflicts.push({
          candidateId: list[i]!.candidateId,
          reason: `interviewer ${list[i]!.interviewerId} is double-booked`,
        });
      }
    }
  }

  return conflicts;
}

/** "10:45" in Mexico City time. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    timeZone: COMPETITION_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}
