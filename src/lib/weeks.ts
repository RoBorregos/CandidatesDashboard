/*
 * Week schedule for the running edition.
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

/**
 * Reserved week number for the shared team-wide final submission. It sits
 * right after the last individual week.
 */
export const FINAL_WEEK = MAX_INDIVIDUAL_WEEK + 1;

/*
 * Which uploads are open is a single switch an admin flips from Team
 * Management (`Config.finalSubmissionOpen`): false opens the individual weeks
 * 2-6, true opens the shared FINAL submission — never both, never neither.
 * The server rejects uploads to the closed side.
 */

/** Assumed until the config has loaded / when no config row exists. */
export const DEFAULT_FINAL_SUBMISSION_OPEN = false;

/** Does the current switch accept uploads to `week`? */
export function isWeekOpen(week: number, finalOpen: boolean): boolean {
  return finalOpen ? isFinalWeek(week) : !isFinalWeek(week);
}

/** Last week the mentor's tracking lets people navigate to. */
export function lastVisibleWeek(finalOpen: boolean): number {
  return finalOpen ? FINAL_WEEK : MAX_INDIVIDUAL_WEEK;
}

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

/** Week time deadline for diff forall weeks */
export const WEEK_2_DUE_AT = "2026-09-12T23:59:59-06:00";

/**
 * Deadline of the FINAL submission: Fri 16 Oct 2026, 23:59 (CDMX). 
 */
export const FINAL_DUE_AT = "2026-10-16T23:59:00-06:00";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Moment this week's delivery closes, or null when the week has no schedule. */
export function weekDueAt(week: number): Date | null {
  if (!Number.isFinite(week)) return null;
  if (week < MIN_UPLOAD_WEEK || week > MAX_UPLOAD_WEEK) return null;
  if (isFinalWeek(week)) {
    const finalDue = new Date(FINAL_DUE_AT);
    return Number.isNaN(finalDue.getTime()) ? null : finalDue;
  }
  const anchor = new Date(WEEK_2_DUE_AT);
  if (Number.isNaN(anchor.getTime())) return null;
  return new Date(anchor.getTime() + (week - MIN_UPLOAD_WEEK) * MS_PER_WEEK);
}

/**
 * When the week's assignment goes out: the moment the previous week closed,
 * i.e. exactly one week before its own deadline.
 */
export function weekAssignedAt(week: number): Date | null {
  // The final deadline is pinned, so it opens when the last numbered week closes.
  if (isFinalWeek(week)) return weekDueAt(MAX_INDIVIDUAL_WEEK);
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
