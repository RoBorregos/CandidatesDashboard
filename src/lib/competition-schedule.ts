/*
 * Competition-day schedule: track runs per round and individual interviews.
 *
 * Structure, from "Reto Candidates Principiantes 2026" and the committee's
 * day plan (Sat 17 Oct 2026, Mexico City time):
 *
 *   - Three rounds. In every round each team runs Pista A and Pista B once,
 *     so a round is two 8-minute segments per team (2 min calibration + 6 min
 *     run).
 *   - There are four tracks: two A and two B. Every segment a pair of teams
 *     starts on A1/A2 and another pair on B1/B2, and a team rests at least
 *     MIN_TRACK_GAP_MS (55 min) between its two tracks (see trackLayout).
 *   - A team must already be in line when the run before its own starts,
 *     so each run is busy from one segment before it until it ends.
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

/**
 * First 2026 layout (groups of four running A and B back to back), kept for
 * the commented-out builder below.
 */
export const TEAMS_PER_GROUP = 4;
export const GROUP_MS = SEGMENTS_PER_ROUND * SEGMENT_MS;

/** Teams that run at the same time on one kind of track (A1 + A2, B1 + B2). */
export const TEAMS_PER_PAIR = 2;

/** Minimum rest between the end of a team's first run and its second run. */
export const MIN_TRACK_GAP_MS = 55 * MINUTE_MS;

/** Start-to-start distance, in segments, that guarantees MIN_TRACK_GAP_MS. */
export const GAP_SEGMENTS = Math.ceil(
  (MIN_TRACK_GAP_MS + SEGMENT_MS) / SEGMENT_MS,
);

/** A team has to be in line when the run before its own starts. */
export const QUEUE_MS = SEGMENT_MS;

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

export type TrackKind = keyof typeof TRACKS;

/** What each track is called on the teams' pages. */
export const TRACK_NAMES: Record<TrackKind, string> = {
  A: "Maze",
  B: "Levels",
};

/**
 * "Pista A1" → { track: "A", lane: "A1" }. Older names without a lane number
 * ("Challenge 1 - Pista B") still map to their track. 2025's Pista C runs are
 * ignored: the 2026 edition only has tracks A and B.
 */
export function parseTrack(
  name: string,
): { track: TrackKind; lane: string } | null {
  const match = /(?:pista|track)\s*([ab])\s*(\d)?/i.exec(name);
  if (!match?.[1]) return null;
  const track = match[1].toUpperCase() as TrackKind;
  return { track, lane: `${track}${match[2] ?? ""}` };
}

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
  /** One interval per run: from lining up until that run ends. */
  busy: Interval[];
};

export type TrackLayout = {
  /** Pairs of teams (the last one may have a single team). */
  pairs: number;
  /** Length of the A/B rotation, in segments. */
  cycle: number;
  /** How many segments after its A run a pair runs B (mod cycle). */
  offset: number;
  /** Segments from the round start until the last run ends. */
  segments: number;
};

/**
 * Every 8-minute segment, one pair of teams starts on A1/A2 and another
 * pair on B1/B2, so all four tracks stay busy. Pair j runs A at segment j
 * and B at segment (j + offset) mod cycle: the first half of the pairs goes
 * A then B, the rest B then A. Both distances are at least GAP_SEGMENTS, so
 * no team runs its second track less than MIN_TRACK_GAP_MS after the first.
 * With few teams the cycle is stretched to 2 * GAP_SEGMENTS and some
 * segments stay empty.
 */
export function trackLayout(teamCount: number): TrackLayout {
  const pairs = Math.ceil(teamCount / TEAMS_PER_PAIR);
  if (pairs === 0) return { pairs, cycle: 0, offset: 0, segments: 0 };

  const cycle = Math.max(pairs, 2 * GAP_SEGMENTS);
  const offset = Math.floor(cycle / 2);
  let segments = 0;
  for (let j = 0; j < pairs; j++) {
    segments = Math.max(segments, j + 1, ((j + offset) % cycle) + 1);
  }
  return { pairs, cycle, offset, segments };
}

/** Fisher-Yates shuffle into a new array, so each round gets its own order. */
export function shuffled<T>(items: T[], random: () => number = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Lays out both runs of every team in every round (see trackLayout).
 * Teams 2j and 2j + 1 form pair j and use lanes 1 and 2, so the order of
 * teamIds is the order teams run in (callers shuffle it per round).
 *
 * Throws if the runs do not fit inside a round window.
 */
export function buildTrackSchedule(
  teamIds: string[],
  windows: RoundWindow[] = roundWindows(),
): TeamRoundSchedule[] {
  const layout = trackLayout(teamIds.length);
  const schedule: TeamRoundSchedule[] = [];

  for (const window of windows) {
    const needed = layout.segments * SEGMENT_MS;
    const available = window.end.getTime() - window.start.getTime();
    if (needed > available) {
      throw new Error(
        `Round ${window.number}: ${teamIds.length} teams need ${needed / MINUTE_MS} min (with ${MIN_TRACK_GAP_MS / MINUTE_MS} min between tracks) but the window only has ${available / MINUTE_MS} min.`,
      );
    }

    teamIds.forEach((teamId, index) => {
      const pair = Math.floor(index / TEAMS_PER_PAIR);
      const lane = index % TEAMS_PER_PAIR;
      const slots = {
        A: pair,
        B: (pair + layout.offset) % layout.cycle,
      } as const;

      const runs: TrackRun[] = (["A", "B"] as const)
        .map((kind) => {
          const start = new Date(
            window.start.getTime() + slots[kind] * SEGMENT_MS,
          );
          return {
            teamId,
            round: window.number,
            group: pair,
            track: TRACKS[kind][lane]!,
            start,
            end: new Date(start.getTime() + SEGMENT_MS),
          };
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      schedule.push({
        teamId,
        round: window.number,
        group: pair,
        runs,
        busy: runs.map((run) => runBusy(run.start, window.start)),
      });
    });
  }

  return schedule;
}

/**
 * In line from the previous segment's start until the run ends. Teams on
 * the first segment line up before the round opens, which is outside any
 * interview window, so the queue is clamped to the round start.
 */
function runBusy(start: Date, roundStart?: Date): Interval {
  const queueFrom = start.getTime() - QUEUE_MS;
  return {
    start: new Date(
      roundStart ? Math.max(roundStart.getTime(), queueFrom) : queueFrom,
    ),
    end: new Date(start.getTime() + SEGMENT_MS),
  };
}

/*
 * First 2026 builder: groups of four running A and B back to back (8 min
 * between tracks). Replaced by the rotation above so teams rest at least
 * MIN_TRACK_GAP_MS between tracks. Kept for reference.

export function buildTrackScheduleGroups(
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
*/

/**
 * Rebuilds the schedule of one stored round (its track runs from the
 * database) so it can be checked like a freshly generated one. Each run is
 * busy from one segment before it (lining up) until it ends.
 */
export function scheduleFromStoredRuns(
  teamId: string,
  round: number,
  runs: { name: string; time: Date }[],
): TeamRoundSchedule | null {
  if (runs.length === 0) return null;
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
    busy: runs.map((run) => runBusy(new Date(run.time))),
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
    .flatMap((entry) => entry.busy)
    .map((busy) => ({
      start: new Date(busy.start.getTime() - travelBufferMs),
      end: new Date(busy.end.getTime() + travelBufferMs),
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
