"use client";

import {
  formatTime,
  parseTrack,
  QUEUE_MS,
  TRACK_NAMES,
  type TrackKind,
} from "~/lib/competition-schedule";
import {
  CHECKPOINT_RESULTS,
  LEVELS_MAX_POINTS,
  MAZE_LIMITS,
  MAZE_MAX_POINTS,
} from "~/lib/scoring";
import { api, type RouterOutputs } from "~/trpc/react";

type ScheduleRound = {
  number: number;
  challenges: { name: string; time: string | Date }[];
};

type Scores = NonNullable<RouterOutputs["team"]["getMyTrackScores"]>;
type RoundScore = Scores["rounds"][number];
type MazeScore = NonNullable<RoundScore["maze"]>;
type LevelsScore = NonNullable<RoundScore["levels"]>;

const TRACKS: TrackKind[] = ["A", "B"];
const MAX_POINTS: Record<TrackKind, number> = {
  A: MAZE_MAX_POINTS,
  B: LEVELS_MAX_POINTS,
};

const checkpointLabel = (value: string) =>
  CHECKPOINT_RESULTS.find((result) => result.value === value)?.label ?? value;

const formatSeconds = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * The team's own competition day: interview time, both runs of every
 * revealed round with their line-up time, and the score of each run as soon
 * as it is judged.
 */
export default function MyTeamSchedule({
  teamName,
  rounds,
  interviewTime,
}: {
  teamName: string;
  rounds: ScheduleRound[];
  interviewTime: Date | string | null;
}) {
  const { data: scores, isLoading: scoresLoading } =
    api.team.getMyTrackScores.useQuery();

  // A round shows up once its schedule is revealed or a run of it is judged.
  const roundNumbers = new Set(rounds.map((round) => round.number));
  for (const score of scores?.rounds ?? []) {
    if (score.maze ?? score.levels) roundNumbers.add(score.round);
  }
  // Latest round first, as on the schedule page.
  const ordered = [...roundNumbers].sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-20">
      <div className="rounded-lg bg-gray-900 p-6 text-center">
        <p className="text-sm uppercase tracking-widest text-gray-400">
          Your team
        </p>
        <p className="font-jersey_25 text-4xl text-roboblue">{teamName}</p>
        <p className="mt-3 text-gray-300">
          Your interview:{" "}
          <span className="font-mono font-semibold text-white">
            {interviewTime ? formatTime(new Date(interviewTime)) : "Pending"}
          </span>
        </p>

        {scores && (
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-800 pt-5">
            <Total label={TRACK_NAMES.A} value={scores.mazeTotal} />
            <Total label={TRACK_NAMES.B} value={scores.levelsTotal} />
            <Total
              label="Total"
              value={scores.mazeTotal + scores.levelsTotal}
              strong
            />
          </div>
        )}
      </div>

      {ordered.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="mb-2 text-xl font-semibold">No rounds available</h3>
          <p className="text-gray-400">
            Your schedule will show up here as each round is revealed.
          </p>
        </div>
      ) : (
        ordered.map((number) => (
          <RoundCard
            key={number}
            number={number}
            round={rounds.find((round) => round.number === number)}
            score={scores?.rounds.find((score) => score.round === number)}
            scoresLoading={scoresLoading}
          />
        ))
      )}
    </div>
  );
}

function Total({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-gray-400">{label}</p>
      <p
        className={`font-mono text-2xl font-semibold ${strong ? "text-roboblue" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

function RoundCard({
  number,
  round,
  score,
  scoresLoading,
}: {
  number: number;
  round: ScheduleRound | undefined;
  score: RoundScore | undefined;
  scoresLoading: boolean;
}) {
  const runs = new Map(
    (round?.challenges ?? []).flatMap((ch) => {
      const parsed = parseTrack(ch.name);
      return parsed
        ? [[parsed.track, { lane: parsed.lane, time: new Date(ch.time) }]]
        : [];
    }),
  );
  // Tracks in the order the team runs them; unscheduled ones go last.
  const tracks = [...TRACKS].sort(
    (a, b) =>
      (runs.get(a)?.time.getTime() ?? Infinity) -
      (runs.get(b)?.time.getTime() ?? Infinity),
  );

  const judged = [score?.maze, score?.levels].filter(Boolean);
  const roundPoints = (score?.maze?.points ?? 0) + (score?.levels?.points ?? 0);

  return (
    <div className="overflow-hidden rounded-lg">
      <div className="flex items-center justify-between bg-gradient-to-r from-roboblue to-blue-600 p-4">
        <h2 className="text-2xl font-bold">Round {number}</h2>
        <p className="text-right">
          <span className="block text-xs uppercase tracking-widest text-blue-100">
            Round score
          </span>
          <span className="font-mono text-2xl font-semibold">
            {judged.length > 0 ? roundPoints : "—"}
          </span>
        </p>
      </div>
      <div className="bg-gray-900 p-4">
        <ul className="grid gap-3 sm:grid-cols-2">
          {tracks.map((track) => {
            const run = runs.get(track);
            const trackScore = track === "A" ? score?.maze : score?.levels;
            return (
              <li key={track} className="rounded-lg bg-gray-800 p-4">
                <p className="text-sm text-gray-400">
                  Track {track} · {TRACK_NAMES[track]}
                </p>
                {run ? (
                  <>
                    <p className="font-mono text-3xl font-semibold">
                      {formatTime(run.time)}
                    </p>
                    <p className="text-sm text-roboblue">Pista {run.lane}</p>
                    <p className="mt-1 text-xs text-yellow-300">
                      Be in line by{" "}
                      <span className="font-mono font-semibold">
                        {formatTime(new Date(run.time.getTime() - QUEUE_MS))}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Time not revealed</p>
                )}

                <div className="mt-3 border-t border-gray-700 pt-3">
                  {trackScore ? (
                    <TrackScore track={track} score={trackScore} />
                  ) : (
                    <p className="text-sm text-gray-500">
                      {scoresLoading ? "Loading score..." : "Not scored yet"}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function TrackScore({
  track,
  score,
}: {
  track: TrackKind;
  score: MazeScore | LevelsScore;
}) {
  const details: [string, string][] =
    track === "A"
      ? mazeDetails(score as MazeScore)
      : levelsDetails(score as LevelsScore);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p>
          <span className="font-mono text-2xl font-semibold">
            {score.points}
          </span>
          <span className="text-sm text-gray-400"> / {MAX_POINTS[track]}</span>
        </p>
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${
            score.counted
              ? "bg-green-800 text-green-100"
              : "bg-gray-700 text-gray-300"
          }`}
        >
          {score.counted ? "Counts" : "Not counted"}
        </span>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-gray-400 hover:text-white">
          Breakdown
        </summary>
        <dl className="mt-2 space-y-1">
          {[
            ...details,
            ["Run time", formatSeconds(score.runSeconds)],
            ["Lack of progress", String(score.lackOfProgress)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-gray-400">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

const yesNo = (value: boolean) => (value ? "Yes" : "No");

function mazeDetails(score: MazeScore): [string, string][] {
  return [
    [
      "Colors detected",
      `${score.detectedColors} / ${MAZE_LIMITS.detectedColors}`,
    ],
    ["Speedbumps", `${score.speedbumps} / ${MAZE_LIMITS.speedbumps}`],
    ["Final checkpoint", yesNo(score.reachedFinalCheckpoint)],
    ["Return bonus", yesNo(score.returnBonus)],
    [
      "ArUco markers",
      `${score.arucoMarkers} / ${MAZE_LIMITS.arucoMarkers}`,
    ],
  ];
}

function levelsDetails(score: LevelsScore): [string, string][] {
  return [
    ["Took the ball", yesNo(score.tookBall)],
    ["Section 1", checkpointLabel(score.section1)],
    ["Section 2", checkpointLabel(score.section2)],
    ["Section 3", checkpointLabel(score.section3)],
  ];
}
