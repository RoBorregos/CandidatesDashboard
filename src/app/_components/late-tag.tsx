"use client";

import {
  DEADLINE_TIME_ZONE,
  isLate,
  LATE_TAG_LABEL,
  weekDueAt,
} from "~/lib/weeks";

/**
 * "Tardío" chip for a file uploaded after its week's deadline.
 *
 * The verdict is derived on read from the upload time of the file that is
 * on screen and the hardcoded schedule in ~/lib/weeks — nothing is stored,
 * so files uploaded before this feature existed are tagged too, and moving
 * a deadline re-tags them for free.
 *
 * Renders nothing when the file made it in time.
 */
export default function LateTag({
  week,
  uploadedAt,
  className = "",
}: {
  week: number;
  /** When the stored file reached the server (`TeamUpload.updatedAt`). */
  uploadedAt: Date | string | number | null | undefined;
  className?: string;
}) {
  if (!isLate(week, uploadedAt)) return null;

  const due = weekDueAt(week);
  return (
    <LateChip
      title={due ? dueTitle(due) : LATE_TAG_LABEL}
      className={className}
    />
  );
}

/**
 * Same chip against an explicit deadline instead of the weekly schedule
 * (the advanced track's hand-in). Renders nothing when on time or unstamped.
 */
export function DeadlineLateTag({
  dueAt,
  uploadedAt,
  className = "",
}: {
  dueAt: Date | string | number;
  uploadedAt: Date | string | number | null | undefined;
  className?: string;
}) {
  if (uploadedAt == null) return null;
  const due = new Date(dueAt);
  if (new Date(uploadedAt).getTime() <= due.getTime()) return null;

  return <LateChip title={dueTitle(due)} className={className} />;
}

function dueTitle(due: Date) {
  return `Límite de entrega: ${due.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DEADLINE_TIME_ZONE,
  })}`;
}

function LateChip({ title, className }: { title: string; className: string }) {
  return (
    <span
      title={title}
      className={`shrink-0 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-amber-400 ${className}`}
    >
      {LATE_TAG_LABEL}
    </span>
  );
}
