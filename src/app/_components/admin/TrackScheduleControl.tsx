"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import {
  COMPETITION_DATE,
  MIN_TRACK_GAP_MS,
  MINUTE_MS,
  SEGMENT_MS,
  trackLayout,
} from "~/lib/competition-schedule";
import { decodeCsvBytes, SCHEDULE_CSV_HEADER } from "~/lib/schedule-csv";

interface Team {
  id: string;
  name: string;
  isActive: boolean;
}

interface TrackScheduleControlProps {
  activeTeams: Team[];
  refetchScheduleTeams: () => void;
}

type WindowInput = { number: number; start: string; end: string };

/** Committee day plan for Sat 17 Oct 2026 (Mexico City time). */
const DEFAULT_WINDOWS: WindowInput[] = [
  { number: 1, start: "10:00", end: "13:00" },
  { number: 2, start: "14:00", end: "17:00" },
  { number: 3, start: "17:00", end: "20:00" },
];

const LANES = ["A1", "A2", "B1", "B2"] as const;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

type Conflict = { name: string; team: string; time: string; reason: string };

/**
 * 2026 schedule generator: three round windows, each team runs Pista A and
 * Pista B once per round, in a random order per round. Updating a stored
 * round only shifts its times, so a delayed round can be moved on the day
 * without reshuffling teams; rebuilding draws a new order.
 */
export default function TrackScheduleControl({
  activeTeams,
  refetchScheduleTeams,
}: TrackScheduleControlProps) {
  const [date, setDate] = useState(COMPETITION_DATE);
  const [windows, setWindows] = useState<WindowInput[]>(DEFAULT_WINDOWS);
  const [selectedRound, setSelectedRound] = useState(1);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const { data: tables, refetch: refetchTables } =
    api.admin.getTrackScheduleTables.useQuery();

  const generate = api.admin.generateTrackSchedule.useMutation({
    onSuccess(data) {
      for (const { round, minutes } of data.shifted) {
        toast.success(
          minutes === 0
            ? `Round ${round} already starts at that time; nothing moved.`
            : `Round ${round} moved ${minutes > 0 ? "later" : "earlier"} by ${Math.abs(minutes)} min. Teams kept their slots.`,
        );
      }
      if (data.rebuilt.length > 0) {
        toast.success(
          `Round${data.rebuilt.length > 1 ? "s" : ""} ${data.rebuilt.join(", ")} generated for ${data.teamsScheduled} teams in random order (${data.minutesPerRound} min per round).`,
        );
      }
      if (data.unscheduledTeams.length > 0) {
        toast.warning(
          `No slot in the shifted rounds for: ${data.unscheduledTeams.join(", ")}. Only a rebuild gives them one.`,
        );
      }
      setConflicts(data.interviewConflicts);
      if (data.interviewConflicts.length > 0) {
        toast.warning(
          `${data.interviewConflicts.length} interviews now clash with the new times. See the list below.`,
        );
      }
      void refetchTables();
      void refetchScheduleTeams();
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  // const groups = Math.ceil(activeTeams.length / TEAMS_PER_GROUP);
  // const neededMinutes = (groups * GROUP_MS) / MINUTE_MS;
  const layout = trackLayout(activeTeams.length);
  const neededMinutes = (layout.segments * SEGMENT_MS) / MINUTE_MS;
  const gapMinutes = MIN_TRACK_GAP_MS / MINUTE_MS;

  const updateWindow = (
    number: number,
    field: "start" | "end",
    value: string,
  ) =>
    setWindows((current) =>
      current.map((w) => (w.number === number ? { ...w, [field]: value } : w)),
    );

  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);

  const importCsv = api.admin.importTrackScheduleCsv.useMutation({
    onSuccess(data) {
      toast.success(
        `Imported ${data.rounds.map((r) => `round ${r.round} (${r.teams} teams)`).join(", ")} from the CSV.`,
      );
      // Match the windows to the file so "Update" does not shift it.
      setWindows((current) =>
        current.map((w) => {
          const imported = data.windows.find((i) => i.number === w.number);
          return imported
            ? { ...w, start: imported.start, end: imported.end }
            : w;
        }),
      );
      setCsvErrors([]);
      setCsvWarnings(data.warnings);
      setConflicts(data.interviewConflicts);
      if (data.interviewConflicts.length > 0) {
        toast.warning(
          `${data.interviewConflicts.length} interviews now clash with the new times. See the list below.`,
        );
      }
      void refetchTables();
      void refetchScheduleTeams();
    },
    onError(error) {
      setCsvWarnings([]);
      setCsvErrors(error.message.split("\n"));
      toast.error("The CSV was rejected. Nothing was changed.");
    },
  });

  const uploadCsv = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvErrors([`${file.name} is not a .csv file.`]);
      return;
    }
    const revealed = tables?.filter((t) => t.visible).map((t) => t.number);
    const ok = window.confirm(
      `Every round in ${file.name} replaces the stored one (R1/R2 = round 1, R3/R4 = round 2, R5/R6 = round 3). Rounds not in the file are kept.${
        revealed && revealed.length > 0
          ? ` Round ${revealed.join(", ")} is already revealed: teams will see their times change.`
          : ""
      } Continue?`,
    );
    if (!ok) return;
    const csv = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
    importCsv.mutate({ date, windows, csv });
  };

  const downloadTemplate = () => {
    const rows = [
      SCHEDULE_CSV_HEADER.join(","),
      "R1.0,9:30:00 AM,9:38:00 AM,Team 1,Team 2,Team 3,Team 4",
      "R2.0,10:42:00 AM,10:50:00 AM,Team 3,Team 4,Team 1,Team 2",
    ];
    const url = URL.createObjectURL(
      // The BOM makes Excel open it as UTF-8, so accents survive a re-save.
      new Blob(["\uFEFF" + rows.join("\n") + "\n"], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "schedule-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const run = (rounds: number[], rebuild = false) => {
    const existing = rounds.filter((n) =>
      tables?.some((table) => table.number === n),
    );
    const revealed = existing.filter(
      (n) => tables?.find((table) => table.number === n)?.visible,
    );
    const message = rebuild
      ? `This throws away round ${existing.join(", ")} and draws a new random order for the active teams, so every team gets a new slot and track.${
          revealed.length > 0
            ? ` Round ${revealed.join(", ")} is already revealed: teams will see their times change.`
            : ""
        } Continue?`
      : `This moves every run of round ${existing.join(", ")} to the new start time. Teams keep their slots and tracks. Continue?`;
    if (existing.length > 0 && !window.confirm(message)) return;
    generate.mutate({ date, windows, rounds, rebuild });
  };

  const anyStored = (tables?.length ?? 0) > 0;

  const table = tables?.find((t) => t.number === selectedRound);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="mb-1 text-xl font-semibold">
          Schedule Generation (2026)
        </h3>
        <p className="mb-6 text-sm text-gray-400">
          All times are Mexico City time. Each team runs Pista A and Pista B
          once per round ({SEGMENT_MS / MINUTE_MS} min per run). Every{" "}
          {SEGMENT_MS / MINUTE_MS} min two teams start on A1/A2 and two on
          B1/B2, and every team rests at least {gapMinutes} min between its two
          tracks.
        </p>

        <div className="mb-6 max-w-xs">
          <label className="text-xs text-gray-400" htmlFor="competition-date">
            Competition day
          </label>
          <input
            id="competition-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-gray-600 bg-gray-600 p-2"
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {windows.map((w) => {
            const stored = tables?.find((t) => t.number === w.number);
            // A stored round is only shifted, so its own length counts.
            const roundMinutes = stored?.spanMinutes ?? neededMinutes;
            const available = toMinutes(w.end) - toMinutes(w.start);
            const fits = available >= roundMinutes;
            const lastEnds = fromMinutes(toMinutes(w.start) + roundMinutes);
            const pending =
              generate.isPending &&
              generate.variables?.rounds.includes(w.number);

            return (
              <div key={w.number} className="rounded-lg bg-gray-700 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="font-medium">Round {w.number}</h5>
                  {stored && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        stored.visible ? "bg-green-700" : "bg-gray-600"
                      }`}
                    >
                      {stored.visible ? "Revealed" : "Generated, hidden"}
                    </span>
                  )}
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-400">
                    Start
                    <input
                      type="time"
                      value={w.start}
                      onChange={(e) =>
                        updateWindow(w.number, "start", e.target.value)
                      }
                      className="mt-1 w-full rounded border border-gray-600 bg-gray-600 p-2 text-white"
                    />
                  </label>
                  <label className="text-xs text-gray-400">
                    End
                    <input
                      type="time"
                      value={w.end}
                      onChange={(e) =>
                        updateWindow(w.number, "end", e.target.value)
                      }
                      className="mt-1 w-full rounded border border-gray-600 bg-gray-600 p-2 text-white"
                    />
                  </label>
                </div>

                <p
                  className={`mb-3 text-xs ${fits ? "text-green-300" : "text-red-300"}`}
                >
                  {!stored && activeTeams.length === 0
                    ? "No active teams."
                    : fits
                      ? `Last run ends ${lastEnds} · ${available - roundMinutes} min to spare`
                      : stored
                        ? `This round takes ${roundMinutes} min, the window has ${available} min.`
                        : `${activeTeams.length} teams need ${neededMinutes} min, the window has ${available} min.`}
                </p>

                <button
                  onClick={() => run([w.number])}
                  disabled={
                    generate.isPending ||
                    (!stored && activeTeams.length === 0) ||
                    !fits
                  }
                  className="w-full rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {pending
                    ? "Saving..."
                    : stored
                      ? `Update Round ${w.number} times`
                      : `Generate Round ${w.number}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => run(windows.map((w) => w.number))}
            disabled={generate.isPending || activeTeams.length === 0}
            className="rounded bg-green-600 px-6 py-2 hover:bg-green-700 disabled:opacity-50"
          >
            {generate.isPending
              ? "Saving..."
              : anyStored
                ? "Update all 3 rounds"
                : "Generate all 3 rounds"}
          </button>
          {anyStored && (
            <button
              onClick={() =>
                run(
                  windows.map((w) => w.number),
                  true,
                )
              }
              disabled={generate.isPending || activeTeams.length === 0}
              className="rounded bg-red-700 px-6 py-2 hover:bg-red-800 disabled:opacity-50"
            >
              Rebuild all 3 rounds (new random order)
            </button>
          )}
        </div>

        <div className="mt-6 rounded-lg bg-gray-700 p-4">
          <h4 className="mb-1 font-semibold">Upload schedule from CSV</h4>
          <p className="mb-3 text-sm text-gray-300">
            Sets every team&apos;s times from a hand-made schedule instead of
            the random order. The first row must be exactly{" "}
            <code className="rounded bg-gray-800 px-1 text-xs">
              {SCHEDULE_CSV_HEADER.join(",")}
            </code>
            . R1/R2 are round 1, R3/R4 round 2 and R5/R6 round 3; in each
            round every team must run Reto A once and Reto B once. Team names
            must match existing teams. The day comes from Competition day
            above. Any error rejects the whole file.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label
              className={`cursor-pointer rounded bg-purple-600 px-6 py-2 hover:bg-purple-700 ${
                importCsv.isPending ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {importCsv.isPending ? "Uploading..." : "Upload schedule CSV"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={importCsv.isPending}
                onChange={(e) => {
                  void uploadCsv(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={downloadTemplate}
              className="rounded bg-gray-600 px-4 py-2 text-sm hover:bg-gray-500"
            >
              Download template
            </button>
          </div>

          {csvErrors.length > 0 && (
            <ul className="mt-3 space-y-1 rounded border border-red-500 bg-red-950 p-3 text-sm text-red-200">
              {csvErrors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          )}
          {csvWarnings.length > 0 && (
            <ul className="mt-3 space-y-1 rounded border border-yellow-500 bg-yellow-950 p-3 text-sm text-yellow-200">
              {csvWarnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-gray-700 p-4 text-sm md:grid-cols-4">
          <p>Active teams: {activeTeams.length}</p>
          <p>Min. rest between tracks: {gapMinutes} min</p>
          <p>Minutes per round: {neededMinutes}</p>
          <p>Rounds generated: {tables?.length ?? 0}/3</p>
        </div>

        <div className="mt-4 rounded-lg bg-blue-900 p-4 text-sm text-blue-200">
          <h4 className="mb-2 font-semibold text-white">On competition day</h4>
          <ul className="space-y-1">
            <li>
              • If a round starts late, change its <strong>Start</strong> time
              and click <strong>Update Round N times</strong>: only that round
              moves, and it stays revealed if it already was.
            </li>
            <li>
              • Updating only shifts the stored times: every team keeps its slot
              and track. If a team drops out, deactivate it and its lane stays
              empty; nothing needs to be regenerated.
            </li>
            <li>
              • <strong>Rebuild</strong> draws a new random order. Use it before
              the event (e.g. to add a team), not on a revealed round.
            </li>
            <li>
              • After every update, interviews that now clash with a team&apos;s
              runs are listed below. Fix them in Interview Management.
            </li>
            <li>
              • Revealing rounds to the teams is done in the Round Control tab.
            </li>
          </ul>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-red-500 bg-red-950 p-6">
          <h3 className="mb-3 text-lg font-semibold">
            Interviews that clash with the new times ({conflicts.length})
          </h3>
          <ul className="space-y-1 text-sm">
            {conflicts.map((c, i) => (
              <li key={`${c.name}-${i}`}>
                <span className="font-mono">{c.time}</span> · {c.name} ({c.team}
                ) — {c.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tables && tables.length > 0 && (
        <div className="rounded-lg bg-gray-800 p-6">
          <div className="mb-4 flex items-center gap-4">
            <h3 className="text-xl font-semibold">Current schedule</h3>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(Number(e.target.value))}
              className="rounded bg-gray-700 p-2"
            >
              {tables.map((t) => (
                <option key={t.number} value={t.number}>
                  Round {t.number}
                  {t.visible ? " (revealed)" : ""}
                </option>
              ))}
            </select>
          </div>

          {table ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-600">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="border border-gray-600 p-3 text-left">
                      Time
                    </th>
                    {LANES.map((lane) => (
                      <th
                        key={lane}
                        className="border border-gray-600 p-3 text-center"
                      >
                        Pista {lane}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row) => (
                    <tr key={row.time} className="hover:bg-gray-700">
                      <td className="border border-gray-600 p-3 font-mono">
                        {row.time}
                      </td>
                      {LANES.map((lane) => (
                        <td
                          key={lane}
                          className="border border-gray-600 p-3 text-center"
                        >
                          {row.lanes[lane]?.join(", ") ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">
              Round {selectedRound} has not been generated.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
