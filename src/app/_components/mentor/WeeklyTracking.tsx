"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { AREA_LABELS, INTERVIEW_AREAS } from "~/lib/registration";
import {
  OBJECTIVE_RUBRIC,
  RUBRIC_LEVELS,
  type RubricCriterionKey,
  type RubricLevelValue,
} from "~/lib/rubric";

type ObjectiveDraft = { objective: string; status: string; notes: string };

type ScoreDraft = { level: RubricLevelValue | null; justification: string };

type ReviewDraft = {
  evidence: string;
  mentorQuestions: string;
  justification: string;
  strengths: string;
  opportunities: string;
  recommendations: string;
  scores: Record<RubricCriterionKey, ScoreDraft>;
};

const EMPTY_SCORES = () =>
  Object.fromEntries(
    OBJECTIVE_RUBRIC.map((criterion) => [
      criterion.key,
      { level: null, justification: "" },
    ]),
  ) as Record<RubricCriterionKey, ScoreDraft>;

const EMPTY_REVIEW = (): ReviewDraft => ({
  evidence: "",
  mentorQuestions: "",
  justification: "",
  strengths: "",
  opportunities: "",
  recommendations: "",
  scores: EMPTY_SCORES(),
});

const inputClass =
  "w-full rounded-md border border-gray-600 bg-gray-700 p-2 text-sm text-white outline-none focus:border-blue-500";

export default function WeeklyTracking({
  teamId,
  initialWeek,
}: {
  teamId: string;
  initialWeek: number;
}) {
  const [week, setWeek] = useState(initialWeek);

  const utils = api.useUtils();

  const { data, isLoading, isError, error } = api.mentor.getWeeklyTracking.useQuery(
    { teamId, week },
  );

  const [objectives, setObjectives] = useState<Record<string, ObjectiveDraft>>(
    {},
  );
  const [reviews, setReviews] = useState<Record<string, ReviewDraft>>({});

  /*
   * Drafts are re-seeded whenever the server data changes — switching weeks
   * has to pull that week's answers in, not keep the previous week's on screen.
   */
  useEffect(() => {
    if (!data) return;

    setObjectives(
      Object.fromEntries(
        INTERVIEW_AREAS.map((area) => {
          const saved = data.objectives.find((row) => row.area === area);

          return [
            area,
            {
              objective: saved?.objective ?? "",
              status: saved?.status ?? "",
              notes: saved?.notes ?? "",
            },
          ];
        }),
      ),
    );

    setReviews(
      Object.fromEntries(
        data.team.members.map((member) => {
          const saved = data.reviews.find(
            (row) => row.candidateId === member.id,
          );

          if (!saved) return [member.id, EMPTY_REVIEW()];

          const scores = EMPTY_SCORES();

          for (const score of saved.scores) {
            const key = score.criterion as RubricCriterionKey;
            if (scores[key]) {
              scores[key] = {
                level: score.level,
                justification: score.justification ?? "",
              };
            }
          }

          return [
            member.id,
            {
              evidence: saved.evidence ?? "",
              mentorQuestions: saved.mentorQuestions ?? "",
              justification: saved.justification ?? "",
              strengths: saved.strengths ?? "",
              opportunities: saved.opportunities ?? "",
              recommendations: saved.recommendations ?? "",
              scores,
            },
          ];
        }),
      ),
    );
  }, [data]);

  const refresh = async () => {
    await utils.mentor.getWeeklyTracking.invalidate({ teamId, week });
  };

  const saveObjective = api.mentor.saveWeeklyObjective.useMutation({
    onSuccess: async () => {
      toast.success("Objetivo guardado.");
      await refresh();
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const saveReview = api.mentor.saveWeeklyReview.useMutation({
    onSuccess: async () => {
      toast.success("Seguimiento guardado.");
      await refresh();
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  if (isLoading) {
    return (
      <p className="rounded-lg bg-gray-800 p-6 text-center text-gray-400">
        Cargando seguimiento...
      </p>
    );
  }

  if (isError || !data) {
    return (
      <p className="rounded-lg bg-gray-800 p-6 text-center text-red-400">
        {error?.message ?? "No se pudo cargar el seguimiento."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* Week picker */}
      {/* ========================================================= */}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-800 p-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{data.team.name}</h2>
          <p className="text-sm text-gray-400">Seguimiento semanal</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeek((current) => Math.max(1, current - 1))}
            disabled={week <= 1}
            className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ←
          </button>

          <span className="min-w-24 text-center text-sm font-medium text-white">
            Semana {week}
          </span>

          <button
            type="button"
            onClick={() => setWeek((current) => current + 1)}
            className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
          >
            →
          </button>

          <Link
            href="/mentor"
            className="ml-2 rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
          >
            Volver
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Last week's objectives, the ones being evaluated now */}
      {/* ========================================================= */}

      {week > 1 && (
        <div className="rounded-lg bg-gray-800 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-200">
            Objetivos de la semana {week - 1}
          </h3>

          {data.previousObjectives.length === 0 ? (
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
                      Objetivo
                    </th>
                    <th className="border-l border-gray-700 px-3 py-2">
                      Status
                    </th>
                    <th className="border-l border-gray-700 px-3 py-2">
                      Anotaciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.previousObjectives.map((row) => (
                    <tr key={row.id} className="border-t border-gray-700">
                      <td className="px-3 py-2 font-medium text-white">
                        {AREA_LABELS[row.area]}
                      </td>
                      <td className="border-l border-gray-700 px-3 py-2 text-gray-300">
                        {row.objective}
                      </td>
                      <td className="border-l border-gray-700 px-3 py-2 text-gray-300">
                        {row.status ?? "-"}
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
      )}

      {/* ========================================================= */}
      {/* Block 1 — objectives per area */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-200">
          Objetivos de la semana {week}
        </h3>

        <div className="space-y-4">
          {INTERVIEW_AREAS.map((area) => {
            const draft = objectives[area] ?? {
              objective: "",
              status: "",
              notes: "",
            };

            const update = (patch: Partial<ObjectiveDraft>) =>
              setObjectives((prev) => ({
                ...prev,
                [area]: { ...draft, ...patch },
              }));

            return (
              <div key={area} className="rounded border border-gray-700 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-medium text-white">
                    {AREA_LABELS[area]}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      saveObjective.mutate({
                        teamId,
                        week,
                        area,
                        objective: draft.objective,
                        status: draft.status || undefined,
                        notes: draft.notes || undefined,
                      })
                    }
                    disabled={
                      !draft.objective.trim() || saveObjective.isPending
                    }
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-xs text-gray-400">
                    Objetivo
                    <textarea
                      value={draft.objective}
                      onChange={(event) =>
                        update({ objective: event.target.value })
                      }
                      rows={3}
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>

                  <label className="text-xs text-gray-400">
                    Status
                    <textarea
                      value={draft.status}
                      onChange={(event) =>
                        update({ status: event.target.value })
                      }
                      rows={3}
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>

                  <label className="text-xs text-gray-400">
                    Anotaciones
                    <textarea
                      value={draft.notes}
                      onChange={(event) => update({ notes: event.target.value })}
                      rows={3}
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* Blocks 2 and 3 — per candidate */}
      {/* ========================================================= */}

      {data.team.members.length === 0 ? (
        <p className="rounded-lg bg-gray-800 p-4 text-sm text-gray-400">
          Este equipo todavía no tiene integrantes.
        </p>
      ) : (
        data.team.members.map((member) => {
          const draft = reviews[member.id] ?? EMPTY_REVIEW();

          const update = (patch: Partial<ReviewDraft>) =>
            setReviews((prev) => ({
              ...prev,
              [member.id]: { ...draft, ...patch },
            }));

          const setScore = (
            criterion: RubricCriterionKey,
            patch: Partial<ScoreDraft>,
          ) =>
            update({
              scores: {
                ...draft.scores,
                [criterion]: { ...draft.scores[criterion], ...patch },
              },
            });

          const textFields = [
            ["evidence", "Evidencia presentada"],
            ["mentorQuestions", "Preguntas de mentor"],
            ["justification", "Justificación"],
            ["strengths", "Fortalezas"],
            ["opportunities", "Áreas de oportunidad"],
            ["recommendations", "Recomendaciones de mentor"],
          ] as const;

          return (
            <div key={member.id} className="rounded-lg bg-gray-800 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">
                    {member.name ?? member.email ?? "Sin nombre"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {member.interviewArea
                      ? AREA_LABELS[member.interviewArea]
                      : "Sin área"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    saveReview.mutate({
                      teamId,
                      week,
                      candidateId: member.id,
                      evidence: draft.evidence || undefined,
                      mentorQuestions: draft.mentorQuestions || undefined,
                      justification: draft.justification || undefined,
                      strengths: draft.strengths || undefined,
                      opportunities: draft.opportunities || undefined,
                      recommendations: draft.recommendations || undefined,
                      scores: OBJECTIVE_RUBRIC.flatMap((criterion) => {
                        const score = draft.scores[criterion.key];

                        return score.level
                          ? [
                              {
                                criterion: criterion.key,
                                level: score.level,
                                justification:
                                  score.justification || undefined,
                              },
                            ]
                          : [];
                      }),
                    })
                  }
                  disabled={saveReview.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveReview.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {textFields.map(([field, label]) => (
                  <label key={field} className="text-xs text-gray-400">
                    {label}
                    <textarea
                      value={draft[field]}
                      onChange={(event) =>
                        update({ [field]: event.target.value })
                      }
                      rows={3}
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                ))}
              </div>

              {/* Rubric: pick one level per criterion, justify the pick. */}
              <div className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-gray-200">
                  Evaluación objetivos semanal
                </h4>

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
                        const score = draft.scores[criterion.key];

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
                                      name={`${member.id}-${criterion.key}`}
                                      checked={selected}
                                      onChange={() =>
                                        setScore(criterion.key, {
                                          level: level.value,
                                        })
                                      }
                                      className="mt-0.5 h-4 w-4 shrink-0"
                                    />
                                    <span
                                      className={
                                        selected
                                          ? "text-white"
                                          : "text-gray-400"
                                      }
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
                    <label
                      key={criterion.key}
                      className="block text-xs text-gray-400"
                    >
                      Justificación — {criterion.label}
                      <textarea
                        value={draft.scores[criterion.key].justification}
                        onChange={(event) =>
                          setScore(criterion.key, {
                            justification: event.target.value,
                          })
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
            </div>
          );
        })
      )}
    </div>
  );
}
