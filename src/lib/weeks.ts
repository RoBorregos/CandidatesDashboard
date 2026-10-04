/*
 * Week schedule for the running edition.
 *
 * #113 replaced the cron-driven due dates of #99: the schedule lives here as
 * one hardcoded anchor plus a 7-day cadence, and lateness is derived every
 * time a file is rendered — it is never written to the database (the Prisma
 * schema stays untouched: TeamUpload already records when each file arrived).
 * Because nothing is stored, files uploaded before this code existed are
 * tagged retroactively, and moving a deadline re-tags them in place.
 *
 * TODO(#99): move the anchor (and then the whole schedule) into the config
 * table so the dates can change without a deploy.
 */

/**
 * The week the competition is on right now. Only used to pick which tab the
 * upload screen opens on — it does not decide whether anything is late.
 */
export const CURRENT_WEEK = 6;

/** First week teams may upload to. */
export const MIN_UPLOAD_WEEK = 2;

/** Last numbered week: individual (per-user) folders only go up to this. */
export const MAX_INDIVIDUAL_WEEK = 6;

/** Reserved week number for the shared team-wide final submission. */
export const FINAL_WEEK = 7;

/** Last week accepted by the upload endpoints (the final week included). */
export const MAX_UPLOAD_WEEK = FINAL_WEEK;

/** Time zone every deadline in this file is written in. */
export const DEADLINE_TIME_ZONE = "America/Monterrey";

/** True for the shared team-wide final submission. */
export function isFinalWeek(week: number): boolean {
  return week === FINAL_WEEK;
}

/** Label of the tag shown next to a file delivered after its deadline. */
export const LATE_TAG_LABEL = "Tardío";

/**
 * Deadline of week 2, the first week with uploads. Every other week derives
 * from it with a 7-day cadence, so this single value is the only thing to
 * edit when the schedule shifts.
 *
 * Sat 12 Sep 2026, 23:59:59 (America/Monterrey) gives:
 *   week 3 → Sep 19 · week 4 → Sep 26 · week 5 → Oct 3
 *   week 6 → Oct 10 · FINAL → Oct 17
 *
 * The offset is written explicitly instead of relying on a zone name:
 * Monterrey has no daylight saving since 2022, so -06:00 holds all year.
 */
export const WEEK_2_DUE_AT = "2026-09-12T23:59:59-06:00";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Moment this week's delivery closes, or null when the week has no schedule. */
export function weekDueAt(week: number): Date | null {
  if (!Number.isFinite(week)) return null;
  if (week < MIN_UPLOAD_WEEK || week > MAX_UPLOAD_WEEK) return null;
  const anchor = new Date(WEEK_2_DUE_AT);
  if (Number.isNaN(anchor.getTime())) return null;
  return new Date(anchor.getTime() + (week - MIN_UPLOAD_WEEK) * MS_PER_WEEK);
}

/**
 * When the week's assignment goes out: the moment the previous week closed,
 * i.e. exactly one week before its own deadline.
 */
export function weekAssignedAt(week: number): Date | null {
  const due = weekDueAt(week);
  return due ? new Date(due.getTime() - MS_PER_WEEK) : null;
}

/**
 * Was a file uploaded after its week's deadline?
 *
 * `uploadedAt` should be the moment the file that is on screen reached the
 * server — i.e. `TeamUpload.updatedAt`, which a re-upload moves forward;
 * `createdAt` alone would keep judging a replaced file by its first, on-time
 * upload.
 *
 * Computed on read for both the candidate list and the mentor view, so files
 * uploaded *before* this code existed are tagged retroactively (and moving a
 * deadline re-tags them) without a migration.
 */
export function isLate(
  week: number,
  uploadedAt: Date | string | number | null | undefined,
): boolean {
  if (uploadedAt == null) return false;
  const due = weekDueAt(week);
  if (!due) return false;
  const at = new Date(uploadedAt);
  if (Number.isNaN(at.getTime())) return false;
  return at.getTime() > due.getTime();
}
