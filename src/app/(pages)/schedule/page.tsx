"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import Header from "~/app/_components/header";
import {
  formatTime,
  parseTrack,
  type TrackKind,
} from "~/lib/competition-schedule";
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

type Track = TrackKind;

/** One team on one physical track (A1, A2, B1, B2) at a given time. */
type Entry = { lane: string; team: string; teamId?: string };
type Cell = Record<Track, Entry[]>;
type RoundBucket = { times: Set<string>; rows: Record<string, Cell> };

const TRACKS: Track[] = ["A", "B"];

export default function SchedulePage() {
  const query = api.team.getVisibleSchedules.useQuery();
  const teams: ScheduleTeam[] = Array.isArray(query.data)
    ? (query.data as ScheduleTeam[])
    : [];
  const { isLoading } = query;

  // Highlights the user's own team; their full schedule and scores are on
  // the Team page.
  const { data: session } = useSession();
  const myTeamId = session?.user.teamId ?? null;

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

  return (
    <main className="mt-[4rem] min-h-screen bg-black text-white">
      <div className="md:pb-10">
        <Header
          title="Competition Schedules"
          subtitle={`Rounds revealed: ${roundsRevealed}/3`}
        />
      </div>

      <div className="container mx-auto px-4 py-8">
        {myTeamId && (
          <p className="mb-8 text-center text-sm text-gray-300">
            Your team&apos;s times, interview and scores are on the{" "}
            <Link
              href="/team"
              className="font-semibold text-roboblue hover:underline"
            >
              Team page
            </Link>
            .
          </p>
        )}

        <AllTeamsView teams={teams} highlightTeamId={myTeamId} />

        <ImportantInformation />
      </div>
    </main>
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
            {/* <li>Teams go out in groups of four that start together</li> */}
            <li>At least 55 minutes of rest between your two tracks</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-semibold text-white">Instructions:</h4>
          <ul className="space-y-1 text-gray-300">
            <li>All times are Mexico City time</li>
            <li>
              Be in line 8 minutes before each run: a team that is not there in
              time loses its turn
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
