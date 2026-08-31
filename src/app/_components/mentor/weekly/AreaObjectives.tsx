"use client";

import type { InterviewArea } from "@prisma/client";
import { AREA_LABELS, type INTERVIEW_AREAS } from "~/lib/registration";
import {
  OBJECTIVE_STATUSES,
  type ObjectiveStatusValue,
  type RubricCriterionKey,
} from "~/lib/rubric";
import ObjectiveRubric from "./ObjectiveRubric";
import { inputClass } from "./styles";
import type { ObjectiveDraft, ScoreDraft } from "./types";

export type AreaKey = (typeof INTERVIEW_AREAS)[number];

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  interviewArea: InterviewArea | null;
};

const memberLabel = (member: Member) =>
  member.name ?? member.email ?? "Sin nombre";

/**
 * One area's objectives for the week. An area can hold as many as its members
 * need — two candidates in Programación each set their own — and every row
 * carries its own rubric.
 */
export default function AreaObjectives({
  area,
  drafts,
  members,
  onChange,
  onScoreChange,
  onAdd,
  onRemove,
  onSave,
  savingKey,
  removingKey,
}: {
  area: AreaKey;
  drafts: ObjectiveDraft[];
  members: Member[];
  onChange: (key: string, patch: Partial<ObjectiveDraft>) => void;
  onScoreChange: (
    key: string,
    criterion: RubricCriterionKey,
    patch: Partial<ScoreDraft>,
  ) => void;
  onAdd: () => void;
  onRemove: (draft: ObjectiveDraft) => void;
  onSave: (draft: ObjectiveDraft) => void;
  savingKey: string | null;
  removingKey: string | null;
}) {
  /*
   * Candidates whose area is still unset would be unpickable otherwise, so an
   * area with nobody assigned to it falls back to the whole team.
   */
  const areaMembers = members.filter(
    (member) => member.interviewArea === area,
  );
  const pickable = areaMembers.length > 0 ? areaMembers : members;

  return (
    <div className="rounded border border-gray-700 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="font-medium text-white">{AREA_LABELS[area]}</span>

        <button
          type="button"
          onClick={onAdd}
          className="rounded-md bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-600"
        >
          + Agregar objetivo
        </button>
      </div>

      {drafts.length === 0 ? (
        <p className="text-sm text-gray-400">
          Todavía no hay objetivos en esta área.
        </p>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft, index) => (
            <div
              key={draft.key}
              className="rounded border border-gray-700 bg-gray-900/40 p-3"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold text-gray-200">
                  Objetivo {index + 1}
                  {draft.id === null && (
                    <span className="ml-2 text-xs font-normal text-yellow-500">
                      sin guardar
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSave(draft)}
                    disabled={
                      !draft.objective.trim() || savingKey === draft.key
                    }
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingKey === draft.key ? "Guardando..." : "Guardar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemove(draft)}
                    disabled={removingKey === draft.key}
                    className="rounded-md bg-gray-700 px-3 py-1.5 text-sm text-red-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs text-gray-400">
                  Responsable
                  <select
                    value={draft.candidateId ?? ""}
                    onChange={(event) =>
                      onChange(draft.key, {
                        candidateId: event.target.value || null,
                      })
                    }
                    className={`mt-1 ${inputClass}`}
                  >
                    <option value="">Sin asignar</option>
                    {pickable.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberLabel(member)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-gray-400 md:col-span-2">
                  Objetivo
                  <textarea
                    value={draft.objective}
                    onChange={(event) =>
                      onChange(draft.key, { objective: event.target.value })
                    }
                    rows={3}
                    className={`mt-1 ${inputClass}`}
                  />
                </label>

                <label className="text-xs text-gray-400">
                  Status
                  <select
                    value={draft.status ?? ""}
                    onChange={(event) =>
                      onChange(draft.key, {
                        status:
                          (event.target.value as ObjectiveStatusValue) || null,
                      })
                    }
                    className={`mt-1 ${inputClass}`}
                  >
                    <option value="">Sin definir</option>
                    {OBJECTIVE_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-gray-400 md:col-span-2">
                  Anotaciones
                  <textarea
                    value={draft.notes}
                    onChange={(event) =>
                      onChange(draft.key, { notes: event.target.value })
                    }
                    rows={3}
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
              </div>

              <ObjectiveRubric
                groupName={draft.key}
                scores={draft.scores}
                onChange={(criterion, patch) =>
                  onScoreChange(draft.key, criterion, patch)
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
