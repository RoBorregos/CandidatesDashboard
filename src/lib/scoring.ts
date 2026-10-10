/*
 * Judges' scoring rubric for the 2026 edition, transcribed from
 * "Reto Candidates Principiantes 2026", section 4 (Puntuaciones).
 *
 * This file is the single source of truth: the judge router, the form
 * schemas, the judge forms and the scoreboard all read from it, so changing a
 * value here changes it everywhere. Like ~/lib/rubric, the rubric lives in
 * code rather than in the database.
 *
 * Every round each team runs both tracks once (see ~/lib/competition-schedule):
 *   - Pista A: MAZE    — max 195 points
 *   - Pista B: Niveles — max 240 points
 *
 * The 2026 rules give no points for lack of progress (the 2025 LOP bonus is
 * gone); the count is still recorded for the judges' reference.
 */

/* ------------------------------------------------------------------ */
/* Pista A: MAZE                                                       */
/* ------------------------------------------------------------------ */

export const MAZE_POINTS = {
  /** Per floor colour detected and shown (LED, display...). */
  detectedColor: 5,
  /** Per speedbump fully crossed. */
  speedbump: 5,
  /** Per staircase climbed and descended. */
  staircase: 15,
  /** Crossing the ramp (up and down). */
  ramp: 20,
  /** Reaching the final checkpoint. */
  finalCheckpoint: 25,
  /** BONUS 1: returning along the same path to the starting checkpoint. */
  returnBonus: 35,
  /** BONUS 2: reporting the ArUco marker's ID correctly. */
  arucoBonus: 30,
} as const;

export const MAZE_LIMITS = {
  detectedColors: 4,
  speedbumps: 4,
  staircases: 3,
} as const;

export type MazeScoreInput = {
  detectedColors: number;
  speedbumps: number;
  staircases: number;
  crossedRamp: boolean;
  reachedFinalCheckpoint: boolean;
  returnBonus: boolean;
  arucoBonus: boolean;
};

export function computeMazePoints(input: MazeScoreInput): number {
  const clamp = (value: number, max: number) =>
    Math.min(Math.max(0, Math.trunc(value)), max);

  let points = 0;
  points +=
    clamp(input.detectedColors, MAZE_LIMITS.detectedColors) *
    MAZE_POINTS.detectedColor;
  points +=
    clamp(input.speedbumps, MAZE_LIMITS.speedbumps) * MAZE_POINTS.speedbump;
  points +=
    clamp(input.staircases, MAZE_LIMITS.staircases) * MAZE_POINTS.staircase;
  if (input.crossedRamp) points += MAZE_POINTS.ramp;
  if (input.reachedFinalCheckpoint) points += MAZE_POINTS.finalCheckpoint;
  // The return trip starts at the final checkpoint, so it only counts when
  // the robot got there first.
  if (input.returnBonus && input.reachedFinalCheckpoint) {
    points += MAZE_POINTS.returnBonus;
  }
  if (input.arucoBonus) points += MAZE_POINTS.arucoBonus;
  return points;
}

export const MAZE_MAX_POINTS = computeMazePoints({
  detectedColors: MAZE_LIMITS.detectedColors,
  speedbumps: MAZE_LIMITS.speedbumps,
  staircases: MAZE_LIMITS.staircases,
  crossedRamp: true,
  reachedFinalCheckpoint: true,
  returnBonus: true,
  arucoBonus: true,
});

/* ------------------------------------------------------------------ */
/* Pista B: Niveles                                                    */
/* ------------------------------------------------------------------ */

/**
 * How far a section went: its checkpoint was not reached, reached without
 * the ball, or reached with the ball in possession (>50% inside the robot).
 *
 * A checkpoint the robot was moved to after the fourth lack of progress in a
 * section scores nothing, so judges mark it NOT_REACHED.
 */
export const CHECKPOINT_RESULTS = [
  { value: "NOT_REACHED", label: "Not reached" },
  { value: "WITHOUT_BALL", label: "Reached WITHOUT the ball" },
  { value: "WITH_BALL", label: "Reached WITH the ball" },
] as const;

export type CheckpointResult = (typeof CHECKPOINT_RESULTS)[number]["value"];

export const CHECKPOINT_RESULT_VALUES = CHECKPOINT_RESULTS.map(
  (result) => result.value,
) as unknown as [CheckpointResult, ...CheckpointResult[]];

export const LEVELS_POINTS = {
  /** Taking the ball and getting it out of its hidden unit (Section 1). */
  ballPossession: 15,
  section1: { NOT_REACHED: 0, WITHOUT_BALL: 40, WITH_BALL: 70 },
  section2: { NOT_REACHED: 0, WITHOUT_BALL: 40, WITH_BALL: 70 },
  /** Final checkpoint. WITH_BALL is the track's bonus. */
  section3: { NOT_REACHED: 0, WITHOUT_BALL: 50, WITH_BALL: 85 },
} as const satisfies {
  ballPossession: number;
  section1: Record<CheckpointResult, number>;
  section2: Record<CheckpointResult, number>;
  section3: Record<CheckpointResult, number>;
};

export type LevelsScoreInput = {
  tookBall: boolean;
  section1: CheckpointResult;
  section2: CheckpointResult;
  section3: CheckpointResult;
};

export function computeLevelsPoints(input: LevelsScoreInput): number {
  let points = 0;
  if (input.tookBall) points += LEVELS_POINTS.ballPossession;
  points += LEVELS_POINTS.section1[input.section1];
  points += LEVELS_POINTS.section2[input.section2];
  points += LEVELS_POINTS.section3[input.section3];
  return points;
}

export const LEVELS_MAX_POINTS = computeLevelsPoints({
  tookBall: true,
  section1: "WITH_BALL",
  section2: "WITH_BALL",
  section3: "WITH_BALL",
});

/* ------------------------------------------------------------------ */
/* Rounds and ranking                                                  */
/* ------------------------------------------------------------------ */

export const ROUND_NUMBERS = [1, 2, 3] as const;

/** Run time after calibration: 8 min per track minus 2 min of calibration. */
export const MAX_RUN_SECONDS = 6 * 60;

/**
 * How many of the three rounds count per track: the best two, as in the
 * previous edition's scoreboard.
 *
 * TODO: the 2026 rules do not say how rounds add up; confirm with the
 * committee (3 would count every round).
 */
export const COUNTED_ROUNDS_PER_TRACK = 2;

export type TrackRun = { round: number; points: number; seconds: number };

/**
 * Best `COUNTED_ROUNDS_PER_TRACK` runs of one track. Ties on points prefer
 * the faster run, since time is the tiebreaker.
 */
export function countedRuns(runs: TrackRun[]): TrackRun[] {
  return [...runs]
    .sort((a, b) => b.points - a.points || a.seconds - b.seconds)
    .slice(0, COUNTED_ROUNDS_PER_TRACK);
}

export type RankedTeam = { total: number; tiebreakSeconds: number };

/**
 * Higher total first; on a tie, less time used in the counted runs wins
 * (rules, section 7).
 */
export function compareTeams(a: RankedTeam, b: RankedTeam): number {
  return b.total - a.total || a.tiebreakSeconds - b.tiebreakSeconds;
}
