import scoreboardJson from "../../../public/PastEditions.json";

type Team = {
  nombreEquipo: string;
  puntajePistaA: number;
  puntajePistaB: number;
  puntajePistaC: number;
  puntajeFinal: number;
};

const scoreboard: Record<number, Team[]> = scoreboardJson;

interface ScoreboardTableProps {
  year: number;
}

const ScoreboardTable = ({ year }: ScoreboardTableProps) => {
  const scoreboardData = scoreboard[year] ?? [];

  return (
    <div className="my-10">
      <h3 className="mb-4 font-jersey_25 text-4xl text-roboblue">
        Scoreboard {year}
      </h3>

      {scoreboardData.length === 0 ? (
        <p className="text-center text-gray-400">No hay datos para este año.</p>
      ) : (
        <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-left">
            <thead className="bg-gray-800 text-sm uppercase tracking-wider text-roboblue">
              <tr>
                <th scope="col" className="p-4 text-center font-anton">#</th>
                <th scope="col" className="p-4 font-anton">Equipo</th>
                <th scope="col" className="p-4 text-center font-anton">Pista A</th>
                <th scope="col" className="p-4 text-center font-anton">Pista B</th>
                <th scope="col" className="p-4 text-center font-anton">Pista C</th>
                <th scope="col" className="p-4 text-center font-anton">Puntaje Final</th>
              </tr>
            </thead>
            <tbody>
              {scoreboardData.map((team: Team, index: number) => (
                <tr
                  key={team.nombreEquipo}
                  className="border-b border-gray-700 transition-colors hover:bg-gray-800/50"
                >
                  <td className="p-4 text-center font-bold text-gray-400">{index + 1}</td>
                  <td className="p-4 font-anton text-xl font-bold text-white">
                    {team.nombreEquipo}
                  </td>
                  <td className="p-4 text-center text-lg text-gray-300">{team.puntajePistaA}</td>
                  <td className="p-4 text-center text-lg text-gray-300">{team.puntajePistaB}</td>
                  <td className="p-4 text-center text-lg text-gray-300">{team.puntajePistaC}</td>
                  <td className="p-4 text-center text-xl font-bold text-roboblue">
                    {team.puntajeFinal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ScoreboardTable;
