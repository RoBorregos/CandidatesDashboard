"use client";

import { api } from "~/trpc/react";
import { toast } from "sonner";

interface RoundControlProps {
  config?: any;
  teams?: any[];
  refetchConfig: () => void;
}

export default function RoundControl({
  config,
  teams,
  refetchConfig,
}: RoundControlProps) {
  const revealNextRound = api.admin.revealNextRound.useMutation({
    onSuccess(data) {
      toast(`Round ${data.roundRevealed} revealed!`);
      refetchConfig();
    },
    onError(error) {
      toast("Error revealing round");
      console.error(error);
    },
  });

  const hideRound = api.admin.hideRound.useMutation({
    onSuccess(data) {
      toast(`Round ${data.roundHidden} hidden.`);
      refetchConfig();
    },
    onError(error) {
      toast("Error hiding round");
      console.error(error);
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="mb-4 text-xl font-semibold">Round Visibility Control</h3>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((roundNum) => {
            const isRevealed = (config?.roundsRevealed ?? 0) >= roundNum;
            const isCurrent = config?.currentRound === roundNum;

            return (
              <div
                key={roundNum}
                className={`rounded-lg border p-4 ${
                  isRevealed
                    ? isCurrent
                      ? "border-green-500 bg-green-900"
                      : "border-blue-500 bg-blue-900"
                    : "border-gray-600 bg-gray-700"
                }`}
              >
                <h4 className="mb-2 font-semibold">
                  {roundNum === 1 ? "🥇" : roundNum === 2 ? "🥈" : "🥉"} Ronda{" "}
                  {roundNum}
                </h4>
                <p className="mb-3 text-sm">
                  Estado:{" "}
                  {isRevealed
                    ? isCurrent
                      ? "✅ Actual"
                      : "👁️ Revelada"
                    : "👁️‍🗨️ Oculta"}
                </p>
                {isRevealed && (
                  <button
                    onClick={() => hideRound.mutate({ roundNumber: roundNum })}
                    disabled={hideRound.isPending}
                    className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-700 disabled:bg-gray-600"
                  >
                    Hide Round
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => revealNextRound.mutate()}
            disabled={
              revealNextRound.isPending || (config?.roundsRevealed ?? 0) >= 3
            }
            className="rounded-lg bg-green-600 px-6 py-2 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {revealNextRound.isPending ? "Revealing..." : "Reveal Next Round"}
          </button>
        </div>

        {config && (
          <div className="mt-4 rounded-lg bg-gray-700 p-4">
            <h4 className="mb-2 font-semibold">Current Competition Status:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p>Rounds revealed: {config.roundsRevealed}/3</p>
              <p>Current round: {config.currentRound}</p>
              <p>Total teams: {teams?.length ?? 0}</p>
              <p>
                Competition started: {config.competitionStarted ? "Yes" : "No"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-lg bg-blue-900 p-4">
          <h4 className="mb-2 font-semibold">How it works:</h4>
          <ul className="space-y-1 text-sm text-blue-200">
            <li>
              • <strong>Reveal Round:</strong> Makes a round visible so teams
              can see their schedules
            </li>
            <li>
              • <strong>Hide Round:</strong> Hides a specific round (useful for
              corrections)
            </li>
            <li>
              • <strong>Current Round:</strong> The round currently being
              executed
            </li>
            <li>
              • <strong>Manual Control:</strong> You can reveal/hide rounds
              according to competition progress
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
