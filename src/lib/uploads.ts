/*
 * Upload limits and server-managed file names shared by the upload router and
 * the team / mentor screens. Kept free of server imports so client components
 * can use them directly instead of mirroring the values.
 */

import {
  FINAL_REPOSITORY_FILE,
  LEGACY_FINAL_MANIFEST_FILE,
} from "~/lib/final-deliverables";

// Weekly comments are accumulated into a single COMMENTS.md. A single comment
// (the "diff") is capped at MAX_COMMENT_CHARS characters and MAX_COMMENT_BYTES
// bytes, and every comment is terminated by \x04 so messages can be fragmented
// when read back.
export const COMMENTS_FILE = "COMMENTS.md";
export const MAX_COMMENT_CHARS = 2045;
export const MAX_COMMENT_BYTES = 2048;

// A week's folder may hold up to 256 MB in total (across all files), not a
// per-file cap.
export const MAX_WEEK_BYTES = 256 * 1024 * 1024;

// The FINAL folder (the team's four deliverables) is capped lower: 50 MB in
// total.
export const MAX_FINAL_BYTES = 50 * 1024 * 1024;

// Server-managed files that live next to the uploads but are not submissions.
export const INTERNAL_FILES = [
  COMMENTS_FILE,
  FINAL_REPOSITORY_FILE,
  LEGACY_FINAL_MANIFEST_FILE,
];

/** "1.5 MB"; empty when the size is unknown. */
export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
