"use client";

import React from "react";
import Footer from "../_components/footer";
import Header from "../_components/header";
import Title from "../_components/title";
import { api } from "~/trpc/react";
import { Round } from "../../lib/round";
import RandomText from "../_components/random-text";

const TwitchEmbed = ({ channel }: { channel: string }) => (
  <div className="aspect-video w-full">
    <iframe
      src={`https://player.twitch.tv/?channel=${channel}&parent=candidates.roborregos.com`}
      className="h-full w-full"
      height={"100%"}
      width={"100%"}
      allowFullScreen
    />
  </div>
);

export default function ScoreboardPage() {
  const {
    data: scores,
    isLoading,
    refetch,
  } = api.scoreboard.getScoreboard.useQuery();

  const { data: isFrozen } = api.scoreboard.isScoreboardFrozen.useQuery();

  React.useEffect(() => {
    const interval = setInterval(() => {
      refetch().catch(console.error);
    }, 20000);
    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <div className="mt-[4rem] h-96 bg-black text-sm text-white md:text-base">
      <Header title="Scoreboard" />
      <div className="container mx-auto overflow-x-scroll p-4 scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-roboblue">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Stream section */}
          <div className="w-full">
            <TwitchEmbed channel="RoBorregosTeam" />
          </div>

          {/* Leaderboard section */}
          <div className="my-auto w-full overflow-x-auto">
            <table className="min-w-full border-collapse text-white">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-4 text-left">Rank</th>
                  <th className="p-4 text-left">Team</th>
                  <th className="p-4 text-left">Score</th>
                </tr>
              </thead>
              <tbody>
                {scores ? (
                  scores.slice(0, 5).map((team, index) => (
                    <tr key={team.teamId} className="border-b border-gray-700">
                      <td className="p-4">{index + 1}</td>
                      <td className="p-4">{team.teamName}</td>
                      <td className="p-4">{team.total}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-4 text-center">
                      {isLoading ? "Loading..." : "No data available"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Title title="General" />

      <div className="mx-auto w-full max-w-7xl overflow-x-auto px-4 scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-roboblue">
        <table className="min-w-full border-collapse text-white">
          <colgroup>
            <col />
            <col span={3} />
            <col span={3} />
            <col span={3} />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-4 text-left" rowSpan={2}>
                Team
              </th>
              <th className="p-4 text-center" colSpan={3}>
                Round 1
              </th>
              <th className="p-4 text-center" colSpan={3}>
                Round 2
              </th>
              <th className="p-4 text-center" colSpan={3}>
                Round 3
              </th>
              <th className="p-4 text-right" rowSpan={2}>
                Total
              </th>
            </tr>
            <tr className="border-b border-gray-700">
              <th className="p-3 text-sm font-normal">C1</th>
              <th className="p-3 text-sm font-normal">C2</th>
              <th className="p-3 text-sm font-normal">C3</th>
              <th className="p-3 text-sm font-normal">C1</th>
              <th className="p-3 text-sm font-normal">C2</th>
              <th className="p-3 text-sm font-normal">C3</th>
              <th className="p-3 text-sm font-normal">C1</th>
              <th className="p-3 text-sm font-normal">C2</th>
              <th className="p-3 text-sm font-normal">C3</th>
            </tr>
          </thead>
          <tbody>
            {scores?.map((team) => (
              <tr
                key={team.teamId}
                className="border-b border-gray-700 transition-colors hover:bg-gray-800/30"
              >
                <td className="p-4 font-medium">{team.teamName}</td>
                {Object.values(Round)
                  .filter((value): value is number => typeof value === "number") // Filter only numeric values
                  .map((roundId: Round) => (
                    <React.Fragment key={roundId}>
                      <td className="p-4 text-center">
                        {isFrozen && roundId === Round.C ? (
                          <RandomText />
                        ) : (
                          (team.rounds[roundId]?.challengeA ?? "-")
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isFrozen && roundId === Round.C ? (
                          <RandomText />
                        ) : (
                          (team.rounds[roundId]?.challengeB ?? "-")
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isFrozen && roundId === Round.C ? (
                          <RandomText />
                        ) : (
                          (team.rounds[roundId]?.challengeC ?? "-")
                        )}
                      </td>
                    </React.Fragment>
                  ))}
                <td className="p-4 text-center font-semibold">{team.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Footer />
    </div>
  );
}
