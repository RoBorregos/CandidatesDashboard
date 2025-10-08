"use client";
import { useState } from "react";
import Table from "rbrgs/app/_components/table";

interface Challenge {
  id: string;
  name: string;
  time: Date;
  roundId: string;
}

interface Round {
  number: number;
  challenges: Challenge[];
}

interface TeamSchedule {
  id: string;
  name: string;
  rounds: Round[];
}

interface Data {
  col1: string;
  col2: string;
}

function transformChallengeData(challenges: Challenge[]): Data[] {
  return challenges.map((challenge) => ({
    col1: challenge.time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    col2: challenge.name,
  }));
}

interface PublicScheduleDisplayProps {
  teams: TeamSchedule[];
}

const PublicScheduleDisplay: React.FC<PublicScheduleDisplayProps> = ({
  teams,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [viewMode, setViewMode] = useState<"all" | "single">("all");

  const selectedTeamData = teams.find((team) => team.id === selectedTeam);

  if (viewMode === "single" && selectedTeamData) {
    return (
      <div>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => setViewMode("all")}
            className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            ← Volver a Todos los Equipos
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-blue-400">
              {selectedTeamData.name}
            </h2>
          </div>
        </div>

        {/* Individual team schedule */}
        <div>
          <h3 className="mb-5 text-center font-archivo text-3xl">Rondas</h3>
          {selectedTeamData.rounds?.map((round, key) => (
            <Table
              key={key}
              data={transformChallengeData(round.challenges)}
              title={`Ronda ${round.number}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-bold text-blue-400">
          Selecciona un Equipo
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => {
                setSelectedTeam(team.id);
                setViewMode("single");
              }}
              className="rounded-lg border border-gray-600 bg-gray-800 p-4 text-left transition-colors hover:border-blue-500 hover:bg-gray-700"
            >
              <h3 className="text-lg font-semibold text-white">{team.name}</h3>
              <p className="text-sm text-gray-400">
                {team.rounds?.length || 0} rondas programadas
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Overview of all teams */}
      <div className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-blue-400">
          Vista General de Todos los Equipos
        </h2>

        {teams.map((team) => (
          <div
            key={team.id}
            className="mb-8 rounded-lg border border-gray-600 bg-gray-900 p-6"
          >
            <h3 className="mb-4 text-xl font-semibold text-white">
              {team.name}
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {team.rounds?.map((round) => (
                <div
                  key={`${team.id}-${round.number}`}
                  className="rounded-md bg-gray-800 p-4"
                >
                  <h4 className="mb-2 font-semibold text-blue-300">
                    Ronda {round.number}
                  </h4>
                  <div className="space-y-1 text-sm">
                    {round.challenges.map((challenge) => (
                      <div key={challenge.id} className="flex justify-between">
                        <span className="text-gray-300">{challenge.name}:</span>
                        <span className="text-white">
                          {challenge.time.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicScheduleDisplay;
