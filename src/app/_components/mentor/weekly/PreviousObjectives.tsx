"use client";

import type { InterviewArea, ObjectiveStatus } from "@prisma/client";
import { AREA_LABELS } from "~/lib/registration";
import { OBJECTIVE_STATUS_LABELS } from "~/lib/rubric";

type Row = {
  id: string;
  area: InterviewArea;
  candidateId: string | null;
  objective: string;
  status: ObjectiveStatus | null;
  notes: string | null;
};

/** Last week's objectives — what the mentors sit down to evaluate. */
export default function PreviousObjectives({
  week,
  rows,
  memberNames,
}: {
  week: number;
  rows: Row[];
  memberNames: Map<string, string>;
}) {
  return (
    <div className="rounded-lg bg-gray-800 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-200">
        Objetivos de la semana {week}
      </h3>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">
          No se registraron objetivos esa semana.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-700">
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="bg-gray-900 text-left text-gray-300">
                <th className="px-3 py-2">Área</th>
                <th className="border-l border-gray-700 px-3 py-2">
                  Responsable
                </th>
                <th className="border-l border-gray-700 px-3 py-2">Objetivo</th>
                <th className="border-l border-gray-700 px-3 py-2">Status</th>
                <th className="border-l border-gray-700 px-3 py-2">
                  Anotaciones
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-700">
                  <td className="px-3 py-2 font-medium text-white">
                    {AREA_LABELS[row.area]}
                  </td>
                  <td className="border-l border-gray-700 px-3 py-2 text-gray-300">
                    {(row.candidateId && memberNames.get(row.candidateId)) ?? "-"}
                  </td>
                  <td className="border-l border-gray-700 px-3 py-2 text-gray-300">
                    {row.objective}
                  </td>
                  <td className="border-l border-gray-700 px-3 py-2 text-gray-300">
                    {row.status ? OBJECTIVE_STATUS_LABELS[row.status] : "-"}
                  </td>
                  <td className="border-l border-gray-700 px-3 py-2 text-gray-300">
                    {row.notes ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
