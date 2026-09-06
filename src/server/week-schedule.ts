import { db } from "./db";

/**
 * Week schedule for Candidates 2026.
 *
 * All dates are specified in UTC-6 (America/Monterrey).  They are stored as
 * ISO 8601 strings with the -06:00 offset so JavaScript's `Date` constructor
 * parses them into the correct UTC timestamp automatically.
 *
 * Cron jobs (both Vercel's built-in and node-cron for local dev) run in UTC.
 * When scheduling a cron job to fire at the start/end of a window, convert
 * the UTC-6 time to UTC:  e.g. 00:00 UTC-6 = 06:00 UTC → "0 6 * * *".
 */

export interface WeekWindow {
  /** Week number (1-indexed), matches the `week` field on uploads. */
  week: number;
  /** ISO 8601 with -06:00 offset — start of the upload window. */
  start: string;
  /** ISO 8601 with -06:00 offset — end of the upload window (inclusive). */
  end: string;
}

/**
 * Week schedule: Weeks 2–6 are individual submissions; FINAL (week 7) shares
 * week 6's delivery window but uses a team-wide shared folder.
 * Week 1 is the intro meeting and has no delivery window.
 */
export const WEEK_SCHEDULE: readonly WeekWindow[] = [
  {
    week: 2,
    start: "2026-09-06T00:00:00-06:00",
    end: "2026-09-12T23:59:59-06:00",
  },
  {
    week: 3,
    start: "2026-09-13T00:00:00-06:00",
    end: "2026-09-19T23:59:59-06:00",
  },
  {
    week: 4,
    start: "2026-09-20T00:00:00-06:00",
    end: "2026-09-26T23:59:59-06:00",
  },
  {
    week: 5,
    start: "2026-09-27T00:00:00-06:00",
    end: "2026-10-03T23:59:59-06:00",
  },
  {
    week: 6,
    start: "2026-10-04T00:00:00-06:00",
    end: "2026-10-10T23:59:59-06:00",
  },
] as const;

/** Timezone identifier for the event location. */
export const EVENT_TIMEZONE = "America/Monterrey";

/** UTC offset in hours for Mexico (UTC-6). */
export const UTC_OFFSET_HOURS = -6;

export function resolveCurrentWeek(now: Date = new Date()): number | null {
  const ts = now.getTime();

  for (const window of WEEK_SCHEDULE) {
    const startMs = new Date(window.start).getTime();
    const endMs = new Date(window.end).getTime();
    if (ts >= startMs && ts <= endMs) {
      return window.week;
    }
  }

  return null;
}

/**
 * Check whether uploads are allowed for a specific week number right now.
 * Uploads are only permitted when the real-time clock falls within that
 * week's window.
 */
export function isUploadAllowedForWeek(
  weekNumber: number,
  now: Date = new Date(),
): boolean {
  const currentWeek = resolveCurrentWeek(now);
  if (currentWeek === null) return false;
  // FINAL (week 7) shares week 6's delivery window.
  if (weekNumber === 7) return currentWeek === 6;
  return currentWeek === weekNumber;
}

/**
 * Get the window definition for a specific week, or `null` if not defined.
 */
export function getWeekWindow(weekNumber: number): WeekWindow | null {
  return WEEK_SCHEDULE.find((w) => w.week === weekNumber) ?? null;
}

/**
 * Human-readable error message when an upload is attempted for the wrong week.
 */
export function getUploadDeniedMessage(
  requestedWeek: number,
  now: Date = new Date(),
): string {
  const currentWeek = resolveCurrentWeek(now);
  // FINAL (week 7) shares week 6's window.
  const window =
    getWeekWindow(requestedWeek) ?? (requestedWeek === 7 ? getWeekWindow(6) : null);

  if (!window) {
    return `La semana ${requestedWeek} no tiene una ventana de entrega definida.`;
  }

  if (currentWeek === null) {
    return `No estamos dentro de ninguna semana de entrega. Las ventanas de entrega son: ${WEEK_SCHEDULE.map((w) => `Semana ${w.week}`).join(", ")}.`;
  }

  return `La semana ${requestedWeek} no está abierta. Actualmente estamos en la Semana ${currentWeek}.`;
}

/**
 * Sync `Config.currentWeek` in the database to match the real-time schedule.
 * Called by cron jobs so the admin panel / UI always reflects the active week.
 */
export async function syncCurrentWeekInDb(
  now: Date = new Date(),
): Promise<{
  previousWeek: number;
  currentWeek: number | null;
  updated: boolean;
}> {
  const currentWeek = resolveCurrentWeek(now);

  const config = await db.config.findFirst({ select: { currentWeek: true } });
  const previousWeek = config?.currentWeek ?? 2;

  // When outside all windows, keep the last known week so the UI stays usable.
  const targetWeek = currentWeek ?? previousWeek;
  if (previousWeek === targetWeek) {
    return { previousWeek, currentWeek, updated: false };
  }

  await db.config.upsert({
    where: { id: 1 },
    update: { currentWeek: targetWeek },
    create: { currentWeek: targetWeek },
  });

  return { previousWeek, currentWeek, updated: true };
}
