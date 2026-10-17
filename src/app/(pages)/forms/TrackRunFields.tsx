"use client";

import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import { Input } from "rbrgs/app/_components/shadcn/ui/input";
import {
  CALIBRATION_MS,
  currentOnLane,
  formatTime,
  type LaneRun,
  nextOnLane,
  SEGMENT_MS,
} from "rbrgs/lib/competition-schedule";
import { MAX_RUN_SECONDS, ROUND_NUMBERS } from "rbrgs/lib/scoring";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

/** Fields every 2026 track form shares: round, team, run time and LOP. */
type TrackRunFieldValues = {
  round: number;
  teamId: string;
  runSeconds: number;
  lackOfProgress: number;
};

/** Filled in by the schedule and the timer; every other field is scoring. */
const RUN_FIELDS = new Set(["round", "teamId", "runSeconds"]);

const MAX_RUN_MS = MAX_RUN_SECONDS * 1000;

const runKey = (run: LaneRun | null) =>
  run ? `${run.lane}:${run.teamId}:${run.round}` : "";

/**
 * Where a run sits among its round's runs on the lane, so the counter reads
 * "3 / 18" for the round being judged instead of counting every round.
 */
const roundPosition = (laneRuns: LaneRun[], run: LaneRun) => {
  const inRound = laneRuns.filter((other) => other.round === run.round);
  const index = inRound.findIndex((other) => runKey(other) === runKey(run));
  return index >= 0 ? { round: run.round, index, total: inRound.length } : null;
};

/** "1:23.4": minutes, seconds and tenths. */
const formatClock = (ms: number) => {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor(tenths / 10) % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths % 10}`;
};

/** Server-corrected Date.now(), refreshed every second or every frame. */
function useClock(offset: number, everyFrame = false) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (everyFrame) {
      let id = 0;
      const tick = () => {
        setNow(Date.now());
        id = requestAnimationFrame(tick);
      };
      id = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(id);
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [everyFrame]);
  return now + offset;
}

type TimerState = {
  /** Run this state belongs to; a new run starts with a fresh timer. */
  key: string;
  /** Segment (calibration + run) started by hand instead of by the schedule. */
  startedAt: number | null;
  /**
   * Run clock started by hand ("Skip calibration" / "Restart run") instead of
   * when calibration ends. The segment start, and so the total, stays put.
   */
  runStartedAt: number | null;
  /** When the judge pressed "Stop". */
  stoppedAt: number | null;
  /** Run time typed by hand, which wins over the timer. */
  overrideSeconds: number | null;
};

const freshTimer = (key: string): TimerState => ({
  key,
  startedAt: null,
  runStartedAt: null,
  stoppedAt: null,
  overrideSeconds: null,
});

/**
 * Team, round and run time for a lane, taken from the stored schedule and the
 * clock so the judge only has to score:
 *   - the team is whoever is on the lane now (or up next), and it stays
 *     pinned once the judge starts scoring, so a new segment starting never
 *     swaps the team under a half-filled form;
 *   - the run clock starts on its own when calibration ends and the judge
 *     only presses "Stop";
 *   - a submitted run gives way to the next one on the lane.
 * The team can still be picked by hand (ManualRunFields) when the schedule
 * is wrong.
 */
export function useTrackRun<T extends FieldValues & TrackRunFieldValues>(
  form: UseFormReturn<T>,
  lane: string,
) {
  const lineup = api.judge.getTrackLineup.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const teams = api.team.getTeamIds.useQuery();
  const utils = api.useUtils();
  const offset = lineup.data
    ? lineup.data.serverNow.getTime() - lineup.dataUpdatedAt
    : 0;
  const clock = () => Date.now() + offset;
  const now = new Date(useClock(offset));

  const runs = useMemo(() => lineup.data?.runs ?? [], [lineup.data]);
  const nowMs = now.getTime();
  const laneRuns = useMemo(
    () =>
      runs
        .filter((run) => run.lane === lane)
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [runs, lane],
  );
  /*
   * Runs stored without a lane number ("Pista A" instead of "Pista A1"), as
   * the CSV importer and the test seeder write them. No lane button can ever
   * select them, so the judge is told to pick the team by hand rather than
   * left looking at an empty lane.
   */
  const unlanedOnTrack = useMemo(
    () => runs.filter((run) => run.lane === lane.charAt(0)).length,
    [runs, lane],
  );
  const [submitted, setSubmitted] = useState<string[]>([]);

  const current = currentOnLane(runs, lane, now);
  const live =
    current && !submitted.includes(runKey(current))
      ? current
      : nextOnLane(runs, lane, now);

  const values = form.watch();
  const defaults = (form.formState.defaultValues ?? {}) as Record<
    string,
    unknown
  >;
  const touched = Object.entries(defaults).some(
    ([key, value]) =>
      !RUN_FIELDS.has(key) &&
      (values as Record<string, unknown>)[key] !== value,
  );

  /*
   * Follow the schedule until the judge commits to this run, then stay put.
   * Starting or stopping the clock counts as committing: without it a timer
   * running on an unscored form is wiped when the next segment begins.
   */
  const [engaged, setEngaged] = useState(false);
  const frozen = touched || engaged;
  const [pinned, setPinned] = useState<LaneRun | null>(null);
  if (!frozen && runKey(pinned) !== runKey(live)) setPinned(live);

  const [manual, setManual] = useState(false);
  // A run reached with the previous/next buttons, instead of the clock's.
  const [chosen, setChosen] = useState<LaneRun | null>(null);
  const target = manual ? null : (chosen ?? pinned);
  const targetKey = runKey(target);

  /*
   * Per the stored schedule (Schedule Control): the team's run on this track
   * in that round, on either lane, is over and is not the run being judged
   * right now. Compared against the target rather than whatever the clock
   * says, so browsing back to a late submission does not flag itself.
   * Evaluations don't count, so test or duplicate ones never flag a team.
   */
  const ranKeys = useMemo(() => {
    const over = new Set<string>();
    for (const run of runs) {
      if (!run.lane.startsWith(lane.charAt(0))) continue;
      if (run.start.getTime() + SEGMENT_MS > nowMs) continue;
      if (runKey(run) === targetKey) continue;
      over.add(`${run.teamId}:${run.round}`);
    }
    return over;
  }, [runs, lane, nowMs, targetKey]);
  const alreadyRan = (teamId: string, round: number) =>
    ranKeys.has(`${teamId}:${round}`);

  const index = laneRuns.findIndex((run) => runKey(run) === targetKey);
  const previous =
    index >= 0
      ? (laneRuns[index - 1] ?? null)
      : ([...laneRuns].reverse().find((run) => run.start <= now) ?? null);
  const following =
    index >= 0 ? (laneRuns[index + 1] ?? null) : nextOnLane(runs, lane, now);
  const browse = (run: LaneRun | null) => {
    if (!run) return;
    setManual(false);
    setChosen(run);
  };

  const [resets, setResets] = useState(0);
  useEffect(() => {
    if (manual) return;
    form.setValue(
      "teamId" as Path<T>,
      (target?.teamId ?? "") as PathValue<T, Path<T>>,
    );
    if (target) {
      form.setValue("round" as Path<T>, target.round as PathValue<T, Path<T>>);
    }
  }, [form, manual, target, resets]);

  const [timer, setTimer] = useState(() => freshTimer(targetKey));
  if (timer.key !== targetKey) setTimer(freshTimer(targetKey));

  // Every segment, by hand or by the schedule, opens with CALIBRATION_MS.
  const segmentStart = timer.startedAt ?? target?.start.getTime() ?? null;
  const anchor =
    timer.runStartedAt ??
    (segmentStart === null ? null : segmentStart + CALIBRATION_MS);
  const elapsedAt = (at: number) =>
    anchor === null
      ? 0
      : Math.min(Math.max((timer.stoppedAt ?? at) - anchor, 0), MAX_RUN_MS);

  const upcoming = nextOnLane(runs, lane, target?.start ?? now);
  /*
   * When the next match on the lane starts, for the cooldown countdown: the
   * next scheduled run, or one segment after this one started when there is
   * none (last run of the day, or a team picked by hand).
   */
  const nextMatchAt =
    (target ? upcoming?.start.getTime() : undefined) ??
    (segmentStart === null ? null : segmentStart + SEGMENT_MS);

  const teamName =
    teams.data?.find((team) => team.id === values.teamId)?.name ??
    target?.teamName ??
    null;

  return {
    lane,
    loading: lineup.isLoading,
    offset,
    now,
    target,
    live,
    upcoming,
    manual,
    browsing: chosen !== null,
    position: target ? roundPosition(laneRuns, target) : null,
    previous,
    following,
    alreadyRan,
    teamId: values.teamId,
    teamName,
    round: values.round,
    teams: teams.data ?? [],
    teamsLoading: teams.isLoading,
    timer,
    segmentStart,
    anchor,
    nextMatchAt,
    elapsedAt,
    /** Run time to submit, in whole seconds. */
    runSeconds: () =>
      timer.overrideSeconds ?? Math.floor(elapsedAt(clock()) / 1000),
    /** No clock ever ran and no time was typed: submitting would store 0s. */
    timeMissing:
      timer.overrideSeconds === null && Math.floor(elapsedAt(nowMs) / 1000) <= 0,
    /*
     * The run time to save, or null when the judge backed out. Time is the
     * tiebreaker and the scoreboard sorts seconds ascending, so a 0-second
     * run beats every other run it ties with on points. That is occasionally
     * right (a team that never ran) but never something to save silently.
     */
    confirmRunSeconds: () => {
      const seconds =
        timer.overrideSeconds ?? Math.floor(elapsedAt(clock()) / 1000);
      if (seconds > 0) return seconds;
      return window.confirm(
        "The run clock never started, so this evaluation would be saved with a run time of 0 seconds.\n\n" +
          "Time is the tiebreaker, so a 0-second run wins every tie on points.\n\n" +
          "Save it as 0 seconds anyway?",
      )
        ? seconds
        : null;
    },
    /** Runs on this track stored without a lane number; see unlanedOnTrack. */
    unlanedOnTrack,

    pickTeam: (teamId: string) => {
      setManual(true);
      form.setValue("teamId" as Path<T>, teamId as PathValue<T, Path<T>>);
    },
    pickRound: (round: number) => {
      form.setValue("round" as Path<T>, round as PathValue<T, Path<T>>);
    },
    followSchedule: () => {
      setManual(false);
      setChosen(null);
      setEngaged(false);
    },
    goPrevious: () => browse(previous),
    goNext: () => browse(following),

    /** Starts a segment now: 2 min of calibration, then the run clock. */
    startTimer: () => {
      setEngaged(true);
      setTimer((t) => ({
        ...t,
        startedAt: clock(),
        runStartedAt: null,
        stoppedAt: null,
      }));
    },
    /** Starts the run clock now, skipping (the rest of) calibration. */
    startRunNow: () => {
      setEngaged(true);
      setTimer((t) => ({ ...t, runStartedAt: clock(), stoppedAt: null }));
    },
    stopTimer: () => {
      setEngaged(true);
      setTimer((t) => ({ ...t, stoppedAt: clock() }));
    },
    /*
     * Picks the run clock up where it stopped: the anchor moves forward by
     * however long the judge was paused, so deliberating between "Stop" and
     * "Resume" is not billed to the team as run time.
     */
    resumeTimer: () => {
      setTimer((t) => {
        if (t.stoppedAt === null || anchor === null) {
          return { ...t, stoppedAt: null };
        }
        return {
          ...t,
          stoppedAt: null,
          runStartedAt: anchor + (clock() - t.stoppedAt),
        };
      });
    },
    resetTimer: () => {
      setTimer((t) => ({
        ...t,
        startedAt: null,
        runStartedAt: null,
        stoppedAt: null,
      }));
    },
    overrideSeconds: (seconds: number | null) => {
      setTimer((t) => ({ ...t, overrideSeconds: seconds }));
    },

    /** Clears the form for the next run; returns a key for unmarkSubmitted. */
    markSubmitted: () => {
      const key = targetKey;
      if (key) setSubmitted((keys) => [...keys, key]);
      form.reset();
      setManual(false);
      setChosen(null);
      setEngaged(false);
      void utils.judge.getTrackLineup.invalidate();
      setTimer(freshTimer(key));
      setResets((count) => count + 1);
      return key;
    },
    unmarkSubmitted: (key: string) => {
      setSubmitted((keys) => keys.filter((k) => k !== key));
    },
    /** Re-reads the schedule, e.g. after an undo. */
    refreshLineup: () => void utils.judge.getTrackLineup.invalidate(),
  };
}

export type TrackRun = ReturnType<typeof useTrackRun>;

/** Sticky panel: who is on the lane, the run clock, the subtotal and who is next. */
export function RunHeader({
  run,
  points,
  max,
}: {
  run: TrackRun;
  points: number;
  max: number;
}) {
  const { target, live, upcoming, manual } = run;
  const judged = !!run.teamId && run.alreadyRan(run.teamId, run.round);

  let status = "No run scheduled on this lane";
  if (run.loading) status = "Loading schedule…";
  else if (manual) status = "Picked by hand";
  else if (target && run.browsing)
    status = `Browsing · ${formatTime(target.start)}`;
  else if (target && run.now < target.start)
    status = `Up next · starts ${formatTime(target.start)}`;
  else if (target) status = "On track";

  const swapped = !manual && live && runKey(live) !== runKey(target);
  const navButton =
    "h-10 rounded-lg border-2 border-neutral-700 px-3 text-sm font-semibold transition hover:border-neutral-500 active:scale-[0.97] disabled:opacity-30";

  return (
    <div className="sticky top-16 z-10 -mx-3 -mt-3 border-b border-neutral-800 bg-black/95 p-3 backdrop-blur">
      <div className="flex items-baseline justify-between text-xs uppercase tracking-widest text-neutral-400">
        <span>Pista {run.lane}</span>
        <span>Round {run.round}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={run.goPrevious}
          disabled={!run.previous}
          aria-label="Previous team on this lane"
          className={navButton}
        >
          ‹ Prev
        </button>
        <span className="flex-1 text-center text-xs text-neutral-400">
          {run.position
            ? `Round ${run.position.round} · ${run.position.index + 1} / ${run.position.total}`
            : "—"}
          {(run.browsing || manual) && (
            <button
              type="button"
              onClick={run.followSchedule}
              className="ml-2 text-roboblue underline-offset-4 hover:underline"
            >
              Back to now
            </button>
          )}
        </span>
        <button
          type="button"
          onClick={run.goNext}
          disabled={!run.following}
          aria-label="Next team on this lane"
          className={navButton}
        >
          Next ›
        </button>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs",
              manual ? "text-yellow-400" : "text-neutral-400",
            )}
          >
            {status}
          </p>
          <p
            className={cn(
              "truncate text-2xl font-bold",
              judged && "text-amber-400",
            )}
          >
            {judged && <span aria-hidden>⚠ </span>}
            {run.teamName ?? "—"}
          </p>
        </div>
        <p className="shrink-0 font-digital text-4xl text-roboblue">
          {points}
          <span className="text-xl text-neutral-500"> / {max}</span>
        </p>
      </div>

      <RunTimer run={run} />

      <div className="mt-2 space-y-0.5 text-xs text-neutral-400">
        {!run.loading && !target && run.unlanedOnTrack > 0 && (
          <p className="text-amber-400">
            ⚠ This schedule has {run.unlanedOnTrack} run
            {run.unlanedOnTrack === 1 ? "" : "s"} on Pista {run.lane[0]} stored
            without a lane number, so they cannot be matched to {run.lane}. Pick
            the team by hand below, and ask an admin to re-generate the schedule
            with lanes.
          </p>
        )}
        {judged && (
          <p className="text-amber-400">
            ⚠ This team already ran Pista {run.lane[0]} in round {run.round}{" "}
            (by the schedule). Make sure this is the right team.
          </p>
        )}
        {swapped && (
          <p className="text-yellow-400">
            Now on the lane: {live.teamName}.{" "}
            {run.browsing
              ? "Tap “Back to now” to judge it."
              : "Submit or clear this run to switch."}
          </p>
        )}
        <p>
          Next:{" "}
          {upcoming ? (
            <>
              <RanName
                name={upcoming.teamName}
                judged={run.alreadyRan(upcoming.teamId, upcoming.round)}
              />{" "}
              · {formatTime(upcoming.start)} (round {upcoming.round})
            </>
          ) : (
            "no more runs on this lane"
          )}
        </p>
      </div>
    </div>
  );
}

/** Team name, in amber with a warning sign once its run is over. */
function RanName({ name, judged }: { name: string; judged: boolean }) {
  return (
    <span className={judged ? "text-amber-400" : "text-white"}>
      {judged && <span aria-label="already ran">⚠ </span>}
      {name}
    </span>
  );
}

/**
 * M:SS.d clocks for one 8-minute segment. The big one counts calibration
 * down from 2:00 (green), then the run up to 6:00 (gray); the small one is
 * the total time since the segment started (dark gray). Once the run is over,
 * stopped early or at 6:00, the big one turns into the cooldown: a negative
 * count down to the next match on the lane (blue), with the final run time
 * on the side. With a scheduled run all of it starts on its own; "Start"
 * begins a segment by hand, with the same 2 minutes of calibration.
 */
function RunTimer({ run }: { run: TrackRun }) {
  const at = useClock(run.offset, true);
  const { anchor, segmentStart, nextMatchAt, target, timer } = run;
  const stopped = timer.stoppedAt !== null;

  let phase: "idle" | "waiting" | "calibration" | "run" | "cooldown";
  if (anchor === null || segmentStart === null) phase = "idle";
  else if (at < segmentStart) phase = "waiting";
  else if (!stopped && at < anchor) phase = "calibration";
  else if (
    (stopped || run.elapsedAt(at) >= MAX_RUN_MS) &&
    nextMatchAt !== null &&
    at < nextMatchAt
  )
    phase = "cooldown";
  else phase = "run";

  let label = "Stopwatch";
  let ms = 0;
  let limit: number | null = null;
  let tone = "text-neutral-300";
  let labelTone = "text-neutral-400";
  if (phase === "waiting") {
    label = "Starts in";
    ms = segmentStart! - at;
    tone = "text-neutral-500";
  } else if (phase === "calibration") {
    label = "Calibration";
    ms = anchor! - at;
    limit = CALIBRATION_MS;
    tone = "text-green-400";
  } else if (phase === "cooldown") {
    label = stopped ? "Cooldown · ended early" : "Cooldown";
    ms = nextMatchAt! - at;
    tone = "text-sky-400";
    labelTone = "text-sky-400";
  } else if (phase === "run") {
    ms = run.elapsedAt(at);
    limit = MAX_RUN_MS;
    if (stopped) {
      label = "Stopped";
    } else if (ms >= MAX_RUN_MS) {
      label = "Time's up";
      labelTone = "text-red-400";
    } else {
      label = "Run time";
    }
  }

  // Real time since the segment started, until the run's 6 minutes are up.
  const total =
    segmentStart !== null && anchor !== null && at >= segmentStart
      ? Math.min(at, anchor + MAX_RUN_MS) - segmentStart
      : null;

  const skipCalibration = () => {
    if (
      window.confirm(
        `Skip the rest of calibration (${formatClock(anchor! - at).slice(0, -2)} left) and start the 6-minute run now?`,
      )
    ) {
      run.startRunNow();
    }
  };

  const restartRun = () => {
    if (
      window.confirm(
        `Restart the run timer? ${formatClock(run.elapsedAt(at))} of run time will be lost and it starts again from 0:00.`,
      )
    ) {
      run.startRunNow();
    }
  };

  const button =
    "h-12 flex-1 rounded-lg border-2 text-sm font-semibold transition active:scale-[0.98]";

  return (
    <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
      <div className="flex items-baseline justify-between">
        <span className={cn("text-xs uppercase tracking-widest", labelTone)}>
          {label}
        </span>
        {timer.overrideSeconds !== null && (
          <span className="text-xs text-yellow-400">
            Submitting {timer.overrideSeconds}s typed by hand
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <p
          className={cn(
            "font-digital text-6xl tabular-nums leading-tight",
            tone,
          )}
        >
          {phase === "cooldown" && "-"}
          {formatClock(ms)}
          {limit !== null && (
            <span className="text-2xl text-neutral-600">
              {" "}
              / {formatClock(limit).slice(0, -2)}
            </span>
          )}
        </p>
        {phase === "cooldown" ? (
          <p className="shrink-0 pb-1 text-right font-digital tabular-nums text-neutral-400">
            <span className="block text-[10px] uppercase tracking-widest">
              Run time
            </span>
            <span className="text-2xl">{formatClock(run.elapsedAt(at))}</span>
          </p>
        ) : (
          total !== null && (
            <p className="shrink-0 pb-1 text-right font-digital tabular-nums text-neutral-600">
              <span className="block text-[10px] uppercase tracking-widest">
                Total
              </span>
              <span className="text-2xl">{formatClock(total)}</span>
            </p>
          )
        )}
      </div>
      <div className="mt-2 flex gap-2">
        {phase === "idle" || phase === "waiting" ? (
          <button
            type="button"
            onClick={run.startTimer}
            className={cn(button, "border-roboblue bg-roboblue/20")}
          >
            {phase === "idle" ? "Start" : "Start now"}
          </button>
        ) : phase === "calibration" ? (
          <button
            type="button"
            onClick={skipCalibration}
            className={cn(button, "border-green-500 bg-green-500/20")}
          >
            Skip calibration
          </button>
        ) : stopped ? (
          <button
            type="button"
            onClick={run.resumeTimer}
            className={cn(button, "border-neutral-600")}
          >
            Resume
          </button>
        ) : (
          <button
            type="button"
            onClick={run.stopTimer}
            className={cn(button, "border-red-500 bg-red-500/20")}
          >
            Stop
          </button>
        )}
        {(phase === "run" || phase === "cooldown") && (
          <button
            type="button"
            onClick={restartRun}
            className={cn(button, "border-neutral-700 text-neutral-300")}
          >
            Restart run
          </button>
        )}
        {(timer.startedAt !== null || timer.runStartedAt !== null) && (
          <button
            type="button"
            onClick={run.resetTimer}
            className={cn(button, "border-neutral-700 text-neutral-300")}
          >
            {target ? "Use schedule" : "Reset"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Worst-case fallback at the bottom: the schedule is wrong, fix it by hand. */
export function ManualRunFields({ run }: { run: TrackRun }) {
  const options = run.teams.map((team) => ({
    value: team.id,
    label: run.alreadyRan(team.id, run.round) ? `⚠ ${team.name}` : team.name,
    judged: run.alreadyRan(team.id, run.round),
  }));

  return (
    <details className="rounded-lg border border-neutral-800 p-3">
      <summary className="cursor-pointer text-sm text-neutral-400">
        Wrong team, round or time? Fix it by hand
      </summary>
      <div className="mt-4 space-y-5">
        <p className="text-xs text-neutral-400">
          Only for when the schedule is wrong. A team picked here stays until
          you submit or go back to the schedule.
        </p>

        <div className="space-y-2">
          <p className="text-sm font-medium">Team</p>
          <Select
            className="basic-single"
            classNamePrefix="select"
            placeholder="Type a team name"
            isLoading={run.teamsLoading}
            isSearchable={true}
            value={
              options.find((option) => option.value === run.teamId) ?? null
            }
            onChange={(option) => option && run.pickTeam(option.value)}
            options={options}
            styles={{
              control: (provided) => ({
                ...provided,
                backgroundColor: "black",
                color: "white",
                cursor: "pointer",
              }),
              menu: (provided) => ({ ...provided, backgroundColor: "black" }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isFocused ? "#333" : "black",
                // Tailwind amber-400, as on the header.
                color: state.data.judged ? "#fbbf24" : "white",
                cursor: "pointer",
              }),
              singleValue: (provided, state) => ({
                ...provided,
                color: state.data.judged ? "#fbbf24" : "white",
              }),
              placeholder: (provided) => ({ ...provided, color: "white" }),
              input: (provided) => ({ ...provided, color: "white" }),
            }}
          />
          {run.manual && (
            <button
              type="button"
              onClick={run.followSchedule}
              className="text-sm text-roboblue underline-offset-4 hover:underline"
            >
              Back to the schedule
            </button>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Round</p>
          <div className="grid grid-cols-3 gap-2">
            {ROUND_NUMBERS.map((round) => (
              <button
                key={round}
                type="button"
                aria-pressed={run.round === round}
                onClick={() => run.pickRound(round)}
                className={cn(
                  "h-12 rounded-lg border-2 font-semibold",
                  run.round === round
                    ? "border-white bg-neutral-800"
                    : "border-neutral-700",
                )}
              >
                {round}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="run-seconds" className="text-sm font-medium">
            Run time in seconds
          </label>
          <p className="text-xs text-neutral-400">
            Leave empty to use the timer. Without the 2 minutes of calibration
            (max {MAX_RUN_SECONDS}).
          </p>
          <Input
            id="run-seconds"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_RUN_SECONDS}
            placeholder={String(run.runSeconds())}
            value={run.timer.overrideSeconds ?? ""}
            onChange={(event) => {
              const seconds = event.target.valueAsNumber;
              run.overrideSeconds(
                Number.isNaN(seconds)
                  ? null
                  : Math.min(Math.max(0, Math.trunc(seconds)), MAX_RUN_SECONDS),
              );
            }}
          />
        </div>
      </div>
    </details>
  );
}

/** Full-width submit that says what is about to be saved. */
export function SubmitRunButton({
  run,
  points,
  pending,
}: {
  run: TrackRun;
  points: number;
  pending: boolean;
}) {
  const judged = !!run.teamId && run.alreadyRan(run.teamId, run.round);

  return (
    <div className="space-y-2">
      {run.teamId && run.timeMissing && (
        <p className="text-xs text-amber-400">
          ⚠ No run time yet. Start and stop the clock, or type the seconds by
          hand above, or this is saved as 0 seconds — which wins every tie.
        </p>
      )}
      <button
        type="submit"
        disabled={!run.teamId || pending}
        className={cn(
          "h-16 w-full rounded-lg px-4 text-lg font-semibold transition active:scale-[0.99] disabled:opacity-40",
          judged
            ? "bg-amber-500 text-black hover:bg-amber-500/80"
            : "bg-roboblue hover:bg-roboblue/80",
        )}
      >
        {pending
          ? "Saving…"
          : run.teamId
            ? `${judged ? "⚠ Submit" : "Submit"} ${run.teamName ?? "team"} · Round ${run.round} · ${points} pts`
            : "Pick a team to submit"}
      </button>
    </div>
  );
}
