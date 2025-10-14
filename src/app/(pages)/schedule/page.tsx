"use client";

import Header from "~/app/_components/header";
import { api } from "~/trpc/react";

export default function SchedulePage() {
  const { data: teams, isLoading } = api.team.getVisibleSchedules.useQuery();

  // gets the count of unique round numbers across all teams
  const roundsRevealed = teams
    ? new Set(teams.flatMap((team) => team.rounds.map((round) => round.number)))
        .size
    : 0;

  if (isLoading) {
    return (
      <main className="mt-[4rem] min-h-screen bg-black text-white">
        <div className="md:pb-10">
          <Header title="Schedules" subtitle="Loading schedules..." />
        </div>
        <div className="flex h-64 items-center justify-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-roboblue"></div>
        </div>
      </main>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <main className="mt-[4rem] min-h-screen bg-black text-white">
        <div className="md:pb-10">
          <Header title="Schedules" subtitle="No schedules available yet" />
        </div>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-400">
              Schedules will be revealed soon
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Rounds revealed: {roundsRevealed}/3
            </p>
          </div>
        </div>
      </main>
    );
  }

  interface TeamRoundData {
    teamName: string;
    challenges: Array<{
      name: string;
      time: Date;
    }>;
  }

  const roundData: Record<number, TeamRoundData[]> = {};

  teams.forEach((team) => {
    team.rounds.forEach((round) => {
      if (!roundData[round.number]) {
        roundData[round.number] = [];
      }
      roundData[round.number]!.push({
        teamName: team.name,
        challenges: round.challenges.sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      });
    });
  });

  return (
    <main className="mt-[4rem] min-h-screen bg-black text-white">
      <div className="md:pb-10">
        <Header
          title="Competition Schedules"
          subtitle={`Rounds revealed: ${roundsRevealed}/3`}
        />
      </div>

      <div className="container mx-auto px-4 py-8">
        {Object.keys(roundData)
          .sort((a, b) => Number(a) - Number(b))
          .map((roundNum) => (
            <div key={roundNum} className="mb-12">
              <div className="mb-6 rounded-lg bg-gradient-to-r from-roboblue to-blue-600 p-4">
                <h2 className="text-center text-2xl font-bold">
                  Round {roundNum}
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full overflow-hidden rounded-lg bg-gray-900">
                  <thead>
                    <tr className="bg-gray-800">
                      <th className="p-4 text-left font-semibold">Team</th>
                      <th className="p-4 text-left font-semibold">Track A</th>
                      <th className="p-4 text-left font-semibold">Track B</th>
                      <th className="p-4 text-left font-semibold">Track C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundData[Number(roundNum)]
                      ?.sort((a, b) => a.teamName.localeCompare(b.teamName))
                      .map((teamData, index) => (
                        <tr
                          key={teamData.teamName}
                          className={`border-b border-gray-700 ${
                            index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"
                          } transition-colors hover:bg-gray-700`}
                        >
                          <td className="p-4 font-medium text-roboblue">
                            {teamData.teamName}
                          </td>
                          {teamData.challenges.map((challenge) => (
                            <td key={challenge.name} className="p-4">
                              <div className="flex flex-col">
                                <span className="font-semibold">
                                  {challenge.time.toLocaleTimeString("es-ES", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {challenge.name}
                                </span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

        {Object.keys(roundData).length === 0 && (
          <div className="py-12 text-center">
            <h3 className="mb-2 text-xl font-semibold">No rounds available</h3>
            <p className="text-gray-400">
              Schedules will be published as the competition progresses
            </p>
          </div>
        )}

        <div className="mt-8 rounded-lg bg-gray-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-roboblue">
            Important Information
          </h3>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-semibold text-white">Event Format:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>3 competition rounds</li>
                <li>3 tracks per round (A, B, C)</li>
                <li>Each team goes through all 3 tracks</li>
                <li>5 minutes per track</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-white">Instructions:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>Arrive 5 minutes before your scheduled time</li>
                <li>Schedules may be adjusted based on availability</li>
                <li>Only currently available rounds are shown</li>
                <li>Check regularly for updates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
