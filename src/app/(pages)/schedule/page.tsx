"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Header from "~/app/_components/header";
import { formatTime, GROUP_MS } from "~/lib/competition-schedule";
import { api } from "~/trpc/react";

type ScheduleChallenge = {
  name: string;
  time: string | Date;
};

type ScheduleRound = {
  number: number;
  challenges: ScheduleChallenge[];
};

type ScheduleTeam = {
  id?: string;
  name: string;
  rounds: ScheduleRound[];
};

type Track = "A" | "B";

/** One team on one physical track (A1, A2, B1, B2) at a given time. */
type Entry = { lane: string; team: string; teamId?: string };
type Cell = Record<Track, Entry[]>;
type RoundBucket = { times: Set<string>; rows: Record<string, Cell> };

type View = "all" | "mine";

const TRACKS: Track[] = ["A", "B"];
const TRACK_NAMES: Record<Track, string> = { A: "Maze", B: "Levels" };
const VIEW_STORAGE_KEY = "schedule-view";

/**
 * "Pista A1" → { track: "A", lane: "A1" }. Older names without a lane number
 * ("Challenge 1 - Pista B") still map to their track. 2025's Pista C runs are
 * ignored: the 2026 edition only has tracks A and B.
 */
function parseTrack(name: string): { track: Track; lane: string } | null {
  const match = /(?:pista|track)\s*([ab])\s*(\d)?/i.exec(name);
  if (!match?.[1]) return null;
  const track = match[1].toUpperCase() as Track;
  return { track, lane: `${track}${match[2] ?? ""}` };
}

/** Remembers the chosen view per browser; storage can be unavailable. */
function readStoredView(): View | null {
  try {
    const value = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return value === "all" || value === "mine" ? value : null;
  } catch {
    return null;
  }
}

function storeView(view: View) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Not remembering the choice is fine.
  }
}

export default function SchedulePage() {
  const query = api.team.getVisibleSchedules.useQuery();
  const teams: ScheduleTeam[] = Array.isArray(query.data)
    ? (query.data as ScheduleTeam[])
    : [];
  const { isLoading } = query;

  const { data: session, status } = useSession();
  const myTeamId = session?.user.teamId ?? null;
  const { data: me } = api.team.getCurrentUser.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  // Default to the user's own team when they have one; their last choice
  // wins once the session is known.
  const [view, setView] = useState<View>("all");
  useEffect(() => {
    if (status === "loading") return;
    const stored = readStoredView();
    if (!myTeamId) setView("all");
    else setView(stored ?? "mine");
  }, [status, myTeamId]);

  const changeView = (next: View) => {
    setView(next);
    storeView(next);
  };

  const roundsRevealed = new Set(
    teams.flatMap((t) => (t.rounds ?? []).map((r) => r.number)),
  ).size;

  if (isLoading) {
    return (
      <main className="mt-[4rem] min-h-screen bg-black text-white">
        <div className="md:pb-10">
          <Header title="Schedules" subtitle="Loading schedules..." />
        </div>
        <div className="flex h-64 items-center justify-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-roboblue" />
        </div>
      </main>
    );
  }

  const myTeam = teams.find((team) => team.id === myTeamId) ?? null;

  return (
    <main className="mt-[4rem] min-h-screen bg-black text-white">
      <div className="md:pb-10">
        <Header
          title="Competition Schedules"
          subtitle={`Rounds revealed: ${roundsRevealed}/3`}
        />
      </div>

      <div className="container mx-auto px-4 py-8">
        <ViewSwitch
          view={view}
          onChange={changeView}
          canSeeMine={Boolean(myTeamId)}
        />

        {view === "mine" && myTeamId ? (
          <MyTeamView team={myTeam} interviewTime={me?.interviewTime ?? null} />
        ) : (
          <AllTeamsView teams={teams} highlightTeamId={myTeamId} />
        )}

        <ImportantInformation />
      </div>
    </main>
  );
}

function ViewSwitch({
  view,
  onChange,
  canSeeMine,
}: {
  view: View;
  onChange: (view: View) => void;
  canSeeMine: boolean;
}) {
  const options: { value: View; label: string }[] = [
    { value: "mine", label: "My team" },
    { value: "all", label: "All teams" },
  ];

  return (
    <div className="mb-8 flex flex-col items-center gap-2">
      <div
        role="tablist"
        aria-label="Schedule view"
        className="inline-flex rounded-full border border-gray-700 bg-gray-900 p-1"
      >
        {options.map((option) => {
          const active = view === option.value;
          const disabled = option.value === "mine" && !canSeeMine;
          return (
            <button
              key={option.value}
              role="tab"
              aria-selected={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? "bg-roboblue text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {!canSeeMine && (
        <p className="text-xs text-gray-500">
          Sign in and join a team to see your own schedule.
        </p>
      )}
    </div>
  );
}

function AllTeamsView({
  teams,
  highlightTeamId,
}: {
  teams: ScheduleTeam[];
  highlightTeamId: string | null;
}) {
  const roundBuckets: Record<number, RoundBucket> = {};

  // The API only returns revealed rounds, so every round here is shown.
  for (const team of teams) {
    for (const round of team.rounds ?? []) {
      const rn = Number(round.number);
      const bucket = (roundBuckets[rn] ??= {
        times: new Set<string>(),
        rows: {},
      });

      for (const ch of round.challenges ?? []) {
        const parsed = parseTrack(ch.name);
        if (!parsed) continue;

        // Competition-day times are always shown in Mexico City time.
        const tKey = formatTime(new Date(ch.time));
        bucket.times.add(tKey);

        const row = (bucket.rows[tKey] ??= { A: [], B: [] });
        row[parsed.track].push({
          lane: parsed.lane,
          team: team.name ?? "",
          teamId: team.id,
        });
      }
    }
  }

  for (const bucket of Object.values(roundBuckets)) {
    for (const row of Object.values(bucket.rows)) {
      for (const track of TRACKS) {
        row[track].sort((a, b) => a.lane.localeCompare(b.lane));
      }
    }
  }

  // Latest revealed round first; times inside each round stay ascending.
  const rounds = Object.keys(roundBuckets)
    .map((k) => Number(k))
    .sort((a, b) => b - a);

  if (rounds.length === 0) return <NoRoundsYet />;

  return (
    <>
      {rounds.map((round) => {
        const bucket = roundBuckets[round];
        if (!bucket) return null;

        const times = Array.from(bucket.times).sort((a, b) =>
          a.localeCompare(b),
        );

        return (
          <div key={round} className="mb-12">
            <div className="mb-3 rounded-lg bg-gradient-to-r from-roboblue to-blue-600 p-4">
              <h2 className="text-center text-2xl font-bold">Round {round}</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full overflow-hidden rounded-lg bg-gray-900">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="p-4 text-left font-semibold">Time</th>
                    {TRACKS.map((track) => (
                      <th key={track} className="p-4 text-left font-semibold">
                        Track {track}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {times.map((t, idx) => {
                    const cell = bucket.rows[t] ?? { A: [], B: [] };
                    return (
                      <tr
                        key={`${round}-${t}`}
                        className={`border-b border-gray-700 ${
                          idx % 2 === 0 ? "bg-gray-800" : "bg-gray-900"
                        } transition-colors hover:bg-gray-700`}
                      >
                        <td className="p-4 align-top font-mono font-medium">
                          {t}
                        </td>
                        {TRACKS.map((track) => (
                          <td key={track} className="p-4 align-top">
                            {cell[track].length > 0 ? (
                              <ul className="space-y-1">
                                {cell[track].map((entry) => {
                                  const mine =
                                    highlightTeamId !== null &&
                                    entry.teamId === highlightTeamId;
                                  return (
                                    <li
                                      key={`${entry.lane}-${entry.team}`}
                                      className={
                                        mine
                                          ? "font-semibold text-roboblue"
                                          : undefined
                                      }
                                    >
                                      <span className="mr-2 font-mono text-xs text-roboblue">
                                        {entry.lane}
                                      </span>
                                      {entry.team}
                                      {mine && (
                                        <span className="ml-2 rounded bg-roboblue px-1.5 py-0.5 text-xs text-white">
                                          You
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}

function MyTeamView({
  team,
  interviewTime,
}: {
  team: ScheduleTeam | null;
  interviewTime: Date | string | null;
}) {
  // Latest revealed round first, as in the all-teams view.
  const rounds = [...(team?.rounds ?? [])].sort((a, b) => b.number - a.number);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-lg bg-gray-900 p-6 text-center">
        <p className="text-sm uppercase tracking-widest text-gray-400">
          Your team
        </p>
        <p className="font-jersey_25 text-4xl text-roboblue">
          {team?.name ?? "—"}
        </p>
        <p className="mt-3 text-gray-300">
          Your interview:{" "}
          <span className="font-mono font-semibold text-white">
            {interviewTime ? formatTime(new Date(interviewTime)) : "Pending"}
          </span>
        </p>
      </div>

      {rounds.length === 0 ? (
        <NoRoundsYet />
      ) : (
        rounds.map((round) => {
          const runs = (round.challenges ?? [])
            .map((ch) => ({ ...parseTrack(ch.name), time: new Date(ch.time) }))
            .filter(
              (run): run is { track: Track; lane: string; time: Date } =>
                run.track !== undefined,
            )
            .sort((a, b) => a.time.getTime() - b.time.getTime());
          const first = runs[0];
          // The next group must already be in line when the previous one
          // starts, i.e. one group before this team's first run.
          const lineUpBy = first
            ? formatTime(new Date(first.time.getTime() - GROUP_MS))
            : null;

          return (
            <div key={round.number} className="overflow-hidden rounded-lg">
              <div className="bg-gradient-to-r from-roboblue to-blue-600 p-4">
                <h2 className="text-center text-2xl font-bold">
                  Round {round.number}
                </h2>
              </div>
              <div className="bg-gray-900 p-4">
                {lineUpBy && (
                  <p className="mb-4 text-center text-sm text-yellow-300">
                    Be in line by{" "}
                    <span className="font-mono font-semibold">{lineUpBy}</span>
                  </p>
                )}
                <ul className="grid gap-3 sm:grid-cols-2">
                  {runs.map((run) => (
                    <li
                      key={`${run.lane}-${run.time.getTime()}`}
                      className="rounded-lg bg-gray-800 p-4"
                    >
                      <p className="text-sm text-gray-400">
                        Track {run.track} · {TRACK_NAMES[run.track]}
                      </p>
                      <p className="font-mono text-3xl font-semibold">
                        {formatTime(run.time)}
                      </p>
                      <p className="text-sm text-roboblue">Pista {run.lane}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function NoRoundsYet() {
  return (
    <div className="py-12 text-center">
      <h3 className="mb-2 text-xl font-semibold">No rounds available</h3>
      <p className="text-gray-400">
        Schedules will be published as the competition progresses
      </p>
    </div>
  );
}

function ImportantInformation() {
  return (
    <div className="mt-8 rounded-lg bg-gray-900 p-6">
      <h3 className="mb-4 text-lg font-semibold text-roboblue">
        Important Information
      </h3>
      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
        <div>
          <h4 className="mb-2 font-semibold text-white">Event Format:</h4>
          <ul className="space-y-1 text-gray-300">
            <li>3 competition rounds</li>
            <li>2 tracks per round: A (Maze) and B (Levels), two of each</li>
            <li>Each team runs Track A and Track B once per round</li>
            <li>8 minutes per track: 2 of calibration + 6 of run</li>
            <li>Teams go out in groups of four that start together</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-semibold text-white">Instructions:</h4>
          <ul className="space-y-1 text-gray-300">
            <li>All times are Mexico City time</li>
            <li>
              Be in line when the group before yours starts: a team that is not
              there in time loses its turn
            </li>
            <li>Schedules may be adjusted based on availability</li>
            <li>Only currently available rounds are shown</li>
            <li>Check regularly for updates</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
