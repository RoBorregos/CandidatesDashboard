/*
 * Week schedule for the running edition.
 *
 * #113 is a hotfix for #99: instead of a cron-driven due-date library, the
 * week the competition is on lives here as a constant and every write path
 * compares against it. Bump CURRENT_WEEK by hand each week until the dynamic
 * due dates from #99 land.
 *
 * This module is intentionally dependency-free (no Prisma, no tRPC) so both
 * the server and the upload UI can share it.
 */

/** The week the competition is on right now. Hardcoded on purpose (see above). */
export const CURRENT_WEEK = 6;

/** First week teams may upload to. */
export const MIN_UPLOAD_WEEK = 2;

/** Last numbered week: individual (per-user) folders only go up to this. */
export const MAX_INDIVIDUAL_WEEK = 6;

/** Reserved week number for the shared team-wide final submission. */
export const FINAL_WEEK = 7;

/** Last week accepted by the upload endpoints (the final week included). */
export const MAX_UPLOAD_WEEK = FINAL_WEEK;

/** Shown by the block screen and thrown by every write to a closed week. */
export const WEEK_PAST_DUE_MESSAGE =
  "Esta semana ya pasó su fecha límite: las entregas están cerradas.";

/** True for the shared team-wide final submission. */
export function isFinalWeek(week: number): boolean {
  return week === FINAL_WEEK;
}

/**
 * Is a week's submission window already closed?
 *
 * Every numbered week before the current one is past due; the final week is
 * the last submission of the edition, so it stays open.
 */
export function isWeekPastDue(
  week: number,
  currentWeek: number = CURRENT_WEEK,
): boolean {
  if (isFinalWeek(week)) return false;
  return week >= MIN_UPLOAD_WEEK && week < currentWeek;
}

/** Every numbered week whose submission window already closed, ascending. */
export function pastDueWeeks(currentWeek: number = CURRENT_WEEK): number[] {
  const weeks: number[] = [];
  for (let week = MIN_UPLOAD_WEEK; week <= MAX_INDIVIDUAL_WEEK; week++) {
    if (isWeekPastDue(week, currentWeek)) weeks.push(week);
  }
  return weeks;
}
