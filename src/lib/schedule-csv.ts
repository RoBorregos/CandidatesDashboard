/*
 * Hand-made track schedule uploaded as a CSV by the committee. One row per
 * 8-minute slot, one column per track:
 *
 *   R-ID,Hora inicio,Hora fin,Reto A Pista 1,Reto A Pista 2,Reto B Pista 1,Reto B Pista 2
 *   R1.0,9:30:00 AM,9:38:00 AM,Vortex,Dynamo,Rezia,Centella
 *
 * Every round is split in two halves: R1/R2 are round 1, R3/R4 round 2 and
 * R5/R6 round 3, and in each round every team runs Reto A (Pista A) once and
 * Reto B (Pista B) once. Pure (no database, no CSV library) so the admin
 * page can share the header.
 */

import {
  competitionTime,
  formatTime,
  MIN_TRACK_GAP_MS,
  MINUTE_MS,
  parseTrack,
  SEGMENT_MS,
  TRACKS,
} from "~/lib/competition-schedule";

export const SCHEDULE_CSV_HEADER = [
  "R-ID",
  "Hora inicio",
  "Hora fin",
  "Reto A Pista 1",
  "Reto A Pista 2",
  "Reto B Pista 1",
  "Reto B Pista 2",
] as const;

/** Columns 3-6 of the header, in order. */
const LANES = [
  { kind: "A", track: TRACKS.A[0] },
  { kind: "A", track: TRACKS.A[1] },
  { kind: "B", track: TRACKS.B[0] },
  { kind: "B", track: TRACKS.B[1] },
] as const;

/** Two R-ID halves per round, three rounds. */
const MAX_HALF = 6;

export type ImportedRun = {
  /** Team name as written in the file, trimmed. */
  team: string;
  round: number;
  /** "Pista A1", "Pista B2", ... */
  track: string;
  start: Date;
  rid: string;
};

/**
 * Decodes an uploaded file whatever Excel saved it as: UTF-16 ("Unicode
 * text", has a BOM), UTF-8 ("CSV UTF-8") or, failing that, Windows-1252
 * (plain "CSV", the default on Spanish Windows), so "Käsestückchen" survives.
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Picks the delimiter used by the header line: comma, semicolon or tab. */
export function detectDelimiter(text: string): string {
  const header = text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  const counts = [",", ";", "\t"].map((d) => ({
    d,
    n: header.split(d).length - 1,
  }));
  return counts.reduce((best, c) => (c.n > best.n ? c : best)).d;
}

/** "9:30:00 AM", "9:30 a. m.", "09:30" or "21:30" → "HH:MM", else null. */
export function parseCsvTime(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(?:([ap])\.?\s*m\.?)?$/i.exec(
    value.trim(),
  );
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (meridiem === "p" ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const sameText = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Checks parsed CSV rows (header included) against the format above and
 * turns them into runs on competition day. Errors reject the whole file;
 * warnings are worth a look but do not block the upload.
 */
export function scheduleFromCsvRows(
  rows: string[][],
  date: string,
): { runs: ImportedRun[]; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const runs: ImportedRun[] = [];

  // Excel adds empty trailing cells and blank lines; ignore them.
  const cleaned = rows
    .map((row, index) => ({ line: index + 1, cells: row.map((c) => c.trim()) }))
    .map(({ line, cells }) => {
      while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
      return { line, cells };
    })
    .filter(({ cells }) => cells.length > 0);

  const [header, ...body] = cleaned;
  const headerOk =
    header?.cells.length === SCHEDULE_CSV_HEADER.length &&
    SCHEDULE_CSV_HEADER.every((name, i) =>
      sameText(header.cells[i]!.replace(/^\uFEFF/, ""), name),
    );
  if (!headerOk) {
    return {
      runs,
      errors: [
        `The first row must be exactly: ${SCHEDULE_CSV_HEADER.join(", ")}. Found: ${header?.cells.join(", ") ?? "nothing"}.`,
      ],
      warnings,
    };
  }
  if (body.length === 0) {
    errors.push("The file has no schedule rows.");
  }

  const seenRids = new Set<string>();
  const lengths = new Set<number>();

  for (const { line, cells } of body) {
    const at = `Line ${line}`;
    if (cells.length > SCHEDULE_CSV_HEADER.length) {
      errors.push(
        `${at}: has ${cells.length} columns, expected ${SCHEDULE_CSV_HEADER.length}.`,
      );
      continue;
    }

    const [rawRid = "", rawStart = "", rawEnd = ""] = cells;
    const rid = rawRid.toUpperCase();
    const ridMatch = /^R(\d+)\.(\d+)$/.exec(rid);
    const half = Number(ridMatch?.[1]);
    if (!ridMatch || half < 1 || half > MAX_HALF) {
      errors.push(
        `${at}: R-ID "${rawRid}" must look like R1.0 … R${MAX_HALF}.N (R1/R2 = round 1, R3/R4 = round 2, R5/R6 = round 3).`,
      );
      continue;
    }
    if (seenRids.has(rid)) {
      errors.push(`${at}: R-ID ${rid} appears more than once.`);
      continue;
    }
    seenRids.add(rid);
    const round = Math.ceil(half / 2);

    const startHhmm = parseCsvTime(rawStart);
    const endHhmm = parseCsvTime(rawEnd);
    if (!startHhmm || !endHhmm) {
      errors.push(
        `${at} (${rid}): times must look like 9:30:00 AM or 21:30 (got "${rawStart}" / "${rawEnd}").`,
      );
      continue;
    }
    const start = competitionTime(startHhmm, date);
    const end = competitionTime(endHhmm, date);
    if (end <= start) {
      errors.push(`${at} (${rid}): Hora fin must be after Hora inicio.`);
      continue;
    }
    lengths.add((end.getTime() - start.getTime()) / MINUTE_MS);

    const inRow = new Set<string>();
    LANES.forEach((lane, i) => {
      const team = cells[3 + i] ?? "";
      if (team === "" || team === "-") return;
      const key = team.toLowerCase();
      if (inRow.has(key)) {
        errors.push(`${at} (${rid}): ${team} is on two tracks at once.`);
        return;
      }
      inRow.add(key);
      runs.push({ team, round, track: lane.track, start, rid });
    });
  }

  for (const minutes of lengths) {
    if (minutes !== SEGMENT_MS / MINUTE_MS) {
      warnings.push(
        `Some slots last ${minutes} min; the dashboard treats every run as ${SEGMENT_MS / MINUTE_MS} min.`,
      );
    }
  }

  // Per team and round: exactly one Reto A and one Reto B, never overlapping.
  const byTeamRound = new Map<string, ImportedRun[]>();
  for (const run of runs) {
    const key = `${run.team.toLowerCase()}|${run.round}`;
    byTeamRound.set(key, [...(byTeamRound.get(key) ?? []), run]);
  }
  for (const teamRuns of byTeamRound.values()) {
    const { team, round } = teamRuns[0]!;
    const kinds = teamRuns.map((run) => parseTrack(run.track)?.track);
    for (const kind of ["A", "B"]) {
      const count = kinds.filter((k) => k === kind).length;
      if (count !== 1) {
        errors.push(
          `Round ${round}: ${team} runs Reto ${kind} ${count} times (${teamRuns.map((r) => r.rid).join(", ")}); it must run it exactly once.`,
        );
      }
    }
    if (teamRuns.length !== 2) continue;

    const [first, second] = [...teamRuns].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
    const gap = second!.start.getTime() - first!.start.getTime() - SEGMENT_MS;
    if (gap < 0) {
      errors.push(
        `Round ${round}: ${team}'s runs ${first!.rid} and ${second!.rid} overlap.`,
      );
    } else if (gap < MIN_TRACK_GAP_MS) {
      warnings.push(
        `Round ${round}: ${team} only rests ${gap / MINUTE_MS} min between ${first!.rid} (${formatTime(first!.start)}) and ${second!.rid} (${formatTime(second!.start)}).`,
      );
    }
  }

  return { runs, errors, warnings };
}
