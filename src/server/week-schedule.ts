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
 * POC schedule: Week 1 (Aug 31 – Sep 5) and Week 2 (Sep 7 – Sep 12), 2026.
 * Extend this array as new weeks are announced.
 */
export const WEEK_SCHEDULE: readonly WeekWindow[] = [
  {
    week: 1,
    start: "2026-08-31T00:00:00-06:00",
    end: "2026-09-05T23:59:59-06:00",
  },
  {
    week: 2,
    start: "2026-09-07T00:00:00-06:00",
    end: "2026-09-12T23:59:59-06:00",
  },
  {
    week: 3,
    start: "2026-09-14T00:00:00-06:00",
    end: "2026-09-19T23:59:59-06:00",
  },
  {
    week: 4,
    start: "2026-09-21T00:00:00-06:00",
    end: "2026-09-26T23:59:59-06:00",
  },
  {
    week: 5,
    start: "2026-09-28T00:00:00-06:00",
    end: "2026-10-03T23:59:59-06:00",
  },
  {
    week: 6,
    start: "2026-10-05T00:00:00-06:00",
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
  return resolveCurrentWeek(now) === weekNumber;
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
  const window = getWeekWindow(requestedWeek);

  if (!window) {
    return `La semana ${requestedWeek} no tiene una ventana de entrega definida.`;
  }

  if (currentWeek === null) {
    return `No estamos dentro de ninguna semana de entrega. Las ventanas de entrega son: ${WEEK_SCHEDULE.map((w) => `Semana ${w.week}`).join(", ")}.`;
  }

  return `La semana ${requestedWeek} no está abierta. Actualmente estamos en la Semana ${currentWeek}.`;
}

/**
 * Build Vercel-compatible cron entries from the week schedule.
 * Each week gets two entries: one to activate at the window start and one to
 * deactivate at the first moment the window is over.  Times are converted
 * from UTC-6 to UTC.
 */
export function buildCronEntries(): { path: string; schedule: string }[] {
  const entries: { path: string; schedule: string }[] = [];

  for (const window of WEEK_SCHEDULE) {
    const startDate = new Date(window.start);
    // The `end` is inclusive (23:59:59 local): activation ends at the first
    // tick of the next day, i.e. start + (window length) + 1ms rounds up — we
    // just take the day after the end at 00:00:00 local.
    const endDate = new Date(window.end);
    const nextDay = new Date(endDate);
    nextDay.setDate(endDate.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);

    const sMin = startDate.getUTCMinutes();
    const sHour = startDate.getUTCHours();
    const sDay = startDate.getUTCDate();
    const sMonth = startDate.getUTCMonth() + 1;

    const eMin = nextDay.getUTCMinutes();
    const eHour = nextDay.getUTCHours();
    const eDay = nextDay.getUTCDate();
    const eMonth = nextDay.getUTCMonth() + 1;

    entries.push({
      path: `/api/cron/toggle-services?action=activate&week=${window.week}`,
      schedule: `${sMin} ${sHour} ${sDay} ${sMonth} *`,
    });

    entries.push({
      path: `/api/cron/toggle-services?action=deactivate&week=${window.week}`,
      schedule: `${eMin} ${eHour} ${eDay} ${eMonth} *`,
    });
  }

  return entries;
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
  const previousWeek = config?.currentWeek ?? 1;

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
