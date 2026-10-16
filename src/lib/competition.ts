/*
 * Competition day for the running edition.
 *
 * TODO: confirm the date with the committee and, like advancedSubmissionDueAt,
 * move it into the config table so it can change without a deploy.
 */

/**
 * Moment the hero countdown reaches zero: 9:00 AM Mexico City time.
 *
 * The offset is written explicitly instead of relying on a zone name: Mexico
 * City has no daylight saving since 2022, so -06:00 holds all year.
 */
export const COMPETITION_STARTS_AT = "2026-10-17T09:00:00-06:00";
