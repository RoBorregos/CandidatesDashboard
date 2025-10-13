import React from "react";

type TableRowProps = {
  team: {
    nombreEquipo: string;
    puntajePistaA: number;
    puntajePistaB: number;
    puntajePistaC: number;
    puntajeFinal: number;
  };
  index: number;
};

const TableRow = ({ team, index }: TableRowProps) => {
  return (
    <tr className="border-b border-gray-700 transition-colors hover:bg-gray-800/50">
      <td className="p-4 text-center font-bold text-gray-400">{index + 1}</td>
      <td className="p-4 font-anton text-xl font-bold text-white">{team.nombreEquipo}</td>
      <td className="p-4 text-center text-lg text-gray-300">{team.puntajePistaA}</td>
      <td className="p-4 text-center text-lg text-gray-300">{team.puntajePistaB}</td>
      <td className="p-4 text-center text-lg text-gray-300">{team.puntajePistaC}</td>
      <td className="p-4 text-center text-xl font-bold text-roboblue">{team.puntajeFinal}</td>
    </tr>
  );
};

export default TableRow;
