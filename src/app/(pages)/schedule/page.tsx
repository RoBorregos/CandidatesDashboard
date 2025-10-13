"use client";

import Header from "rbrgs/app/_components/header";
import { api } from "~/trpc/react";

export default function SchedulePage() {
  const { data: teams, isLoading } = api.team.getVisibleSchedules.useQuery();
  const { data: config } = api.admin.getConfig.useQuery();

  if (isLoading) {
    return (
      <main className="mt-[4rem] min-h-screen bg-black text-white">
        <div className="md:pb-10">
          <Header title="Horarios" subtitle="Cargando horarios..." />
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
          <Header title="Horarios" subtitle="No hay horarios disponibles aún" />
        </div>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-400">
              Los horarios se revelarán próximamente
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Rondas reveladas: {config?.roundsRevealed ?? 0}/3
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Group teams by round for better display
  const roundData: { [key: number]: any[] } = {};

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
          title="Horarios de Competencia"
          subtitle={`Rondas reveladas: ${config?.roundsRevealed ?? 0}/3`}
        />
      </div>

      <div className="container mx-auto px-4 py-8">
        {Object.keys(roundData)
          .sort((a, b) => Number(a) - Number(b))
          .map((roundNum) => (
            <div key={roundNum} className="mb-12">
              <div className="mb-6 rounded-lg bg-gradient-to-r from-roboblue to-blue-600 p-4">
                <h2 className="text-center text-2xl font-bold">
                  Ronda {roundNum}
                </h2>
                <p className="mt-1 text-center text-blue-100">
                  {roundData[Number(roundNum)]?.length} equipos programados
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full overflow-hidden rounded-lg bg-gray-900">
                  <thead>
                    <tr className="bg-gray-800">
                      <th className="p-4 text-left font-semibold">Equipo</th>
                      <th className="p-4 text-left font-semibold">Pista A</th>
                      <th className="p-4 text-left font-semibold">Pista B</th>
                      <th className="p-4 text-left font-semibold">Pista C</th>
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
                          {teamData.challenges.map((challenge: any) => (
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
            <div className="mb-4 text-6xl">📅</div>
            <h3 className="mb-2 text-xl font-semibold">
              No hay rondas disponibles
            </h3>
            <p className="text-gray-400">
              Los horarios se publicarán conforme avance la competencia
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 rounded-lg bg-gray-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-roboblue">
            Información Importante
          </h3>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-semibold text-white">
                Formato del Evento:
              </h4>
              <ul className="space-y-1 text-gray-300">
                <li>• 3 rondas de competencia</li>
                <li>• 3 pistas por ronda (A, B, C)</li>
                <li>• Cada equipo pasa por las 3 pistas</li>
                <li>• 5 minutos por pista</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-white">Instrucciones:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Lleguen 5 minutos antes de su horario</li>
                <li>• Los horarios pueden ajustarse según disponibilidad</li>
                <li>• Solo se muestran las rondas actualmente disponibles</li>
                <li>• Revisen regularmente para actualizaciones</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
