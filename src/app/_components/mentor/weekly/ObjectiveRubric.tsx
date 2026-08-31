"use client";

import {
  OBJECTIVE_RUBRIC,
  RUBRIC_LEVELS,
  type RubricCriterionKey,
} from "~/lib/rubric";
import { inputClass } from "./styles";
import type { ScoreDraft } from "./types";

/**
 * The rubric for a single objective: pick one level per criterion, justify the
 * pick. `groupName` scopes the radio groups so two objectives on screen at the
 * same time don't share a selection.
 */
export default function ObjectiveRubric({
  groupName,
  scores,
  onChange,
}: {
  groupName: string;
  scores: Record<RubricCriterionKey, ScoreDraft>;
  onChange: (criterion: RubricCriterionKey, patch: Partial<ScoreDraft>) => void;
}) {
  return (
    <div className="mt-4">
      <h5 className="mb-2 text-xs font-semibold text-gray-200">
        Evaluación del objetivo
      </h5>

      <div className="overflow-x-auto rounded border border-gray-700">
        <table className="w-full table-auto border-collapse text-sm">
          <thead>
            <tr className="bg-gray-900 text-left text-gray-300">
              <th className="px-3 py-2">Criterio</th>
              {RUBRIC_LEVELS.map((level) => (
                <th
                  key={level.value}
                  className="border-l border-gray-700 px-3 py-2"
                >
                  {level.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {OBJECTIVE_RUBRIC.map((criterion) => {
              const score = scores[criterion.key];

              return (
                <tr
                  key={criterion.key}
                  className="border-t border-gray-700 align-top"
                >
                  <td className="px-3 py-3 font-medium text-white">
                    {criterion.label}
                  </td>

                  {RUBRIC_LEVELS.map((level) => {
                    const selected = score.level === level.value;

                    return (
                      <td
                        key={level.value}
                        className={`border-l border-gray-700 p-0 ${
                          selected ? "bg-blue-900/40" : ""
                        }`}
                      >
                        <label className="flex h-full cursor-pointer gap-2 p-3">
                          <input
                            type="radio"
                            name={`${groupName}-${criterion.key}`}
                            checked={selected}
                            onChange={() =>
                              onChange(criterion.key, { level: level.value })
                            }
                            className="mt-0.5 h-4 w-4 shrink-0"
                          />
                          <span
                            className={selected ? "text-white" : "text-gray-400"}
                          >
                            {criterion.levels[level.value]}
                          </span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-3">
        {OBJECTIVE_RUBRIC.map((criterion) => (
          <label key={criterion.key} className="block text-xs text-gray-400">
            Justificación — {criterion.label}
            <textarea
              value={scores[criterion.key].justification}
              onChange={(event) =>
                onChange(criterion.key, { justification: event.target.value })
              }
              rows={2}
              placeholder="¿Por qué esa calificación?"
              className={`mt-1 ${inputClass}`}
            />
          </label>
        ))}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Un criterio sin casilla marcada no se guarda.
      </p>
    </div>
  );
}
