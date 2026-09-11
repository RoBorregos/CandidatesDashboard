"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { INTERVIEW_AREAS } from "~/lib/registration";
import {
  MAX_TRACKING_WEEK,
  OBJECTIVE_RUBRIC,
  type RubricCriterionKey,
} from "~/lib/rubric";
import {
  INTRO_CANDIDATE_QUESTIONS,
  INTRO_TEAM_QUESTIONS,
  type IntroCandidateQuestionKey,
  type IntroTeamQuestionKey,
  weekLayout,
} from "~/lib/intro-meeting";
import AreaObjectives, {
  type AreaKey,
} from "./weekly/AreaObjectives";
import CandidateReview, { type ReviewDraft } from "./weekly/CandidateReview";
import IntroMeetingBlock, { type TeamNoteDraft } from "./weekly/IntroMeetingBlock";
import PreviousObjectives from "./weekly/PreviousObjectives";
import {
  emptyObjective,
  emptyScores,
  type ObjectiveDraft,
  type ScoreDraft,
} from "./weekly/types";

const EMPTY_REVIEW = (): ReviewDraft => ({
  evidence: "",
  mentorQuestions: "",
  justification: "",
  strengths: "",
  opportunities: "",
  recommendations: "",
  answers: Object.fromEntries(
    INTRO_CANDIDATE_QUESTIONS.map((question) => [question.key, ""]),
  ) as Record<IntroCandidateQuestionKey, string>,
});

const EMPTY_TEAM_NOTE = (): TeamNoteDraft => ({
  generalNotes: "",
  answers: Object.fromEntries(
    INTRO_TEAM_QUESTIONS.map((question) => [question.key, ""]),
  ) as Record<IntroTeamQuestionKey, string>,
});

type ObjectivesByArea = Record<AreaKey, ObjectiveDraft[]>;

const EMPTY_OBJECTIVES = (): ObjectivesByArea => ({
  PROGRAMMING: [],
  MECHANICS: [],
  ELECTRONICS: [],
});

export default function WeeklyTracking({
  teamId,
  initialWeek,
}: {
  teamId: string;
  initialWeek: number;
}) {
  const [week, setWeek] = useState(initialWeek);
  const layout = weekLayout(week);

  const utils = api.useUtils();

  const { data, isLoading, isError, error } = api.mentor.getWeeklyTracking.useQuery(
    { teamId, week },
  );

  const [objectives, setObjectives] = useState<ObjectivesByArea>(
    EMPTY_OBJECTIVES,
  );
  const [reviews, setReviews] = useState<Record<string, ReviewDraft>>({});
  const [teamNote, setTeamNote] = useState<TeamNoteDraft>(EMPTY_TEAM_NOTE);

  // Which row a mutation is currently working on, so only its button spins.
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  // Tracks the teamId/week whose data has already been seeded into drafts,
  // so a refetch after a save (which reuses the same key) doesn't clobber
  // whatever the mentor is still typing elsewhere on the page.
  const seededKeyRef = useRef<string | null>(null);

  /*
   * Drafts are re-seeded only the first time each week's data arrives —
   * switching weeks has to pull that week's answers in, not keep the
   * previous week's on screen. A refetch triggered by saving one row must
   * NOT re-seed, or unsaved edits in every other field get wiped out.
   */
  useEffect(() => {
    if (!data) return;

    const key = `${teamId}:${week}`;
    if (seededKeyRef.current === key) return;
    seededKeyRef.current = key;

    setObjectives(() => {
      const next = EMPTY_OBJECTIVES();

      for (const row of data.objectives) {
        const area = row.area as AreaKey;
        if (!next[area]) continue;

        const scores = emptyScores();

        for (const score of row.scores) {
          const key = score.criterion as RubricCriterionKey;
          if (scores[key]) {
            scores[key] = {
              level: score.level,
              justification: score.justification ?? "",
            };
          }
        }

        next[area].push({
          key: row.id,
          id: row.id,
          candidateId: row.candidateId,
          objective: row.objective,
          status: row.status,
          notes: row.notes ?? "",
          scores,
        });
      }

      return next;
    });

    setReviews(
      Object.fromEntries(
        data.team.members.map((member) => {
          const saved = data.reviews.find(
            (row) => row.candidateId === member.id,
          );

          if (!saved) return [member.id, EMPTY_REVIEW()];

          const draft = EMPTY_REVIEW();

          for (const answer of saved.answers) {
            const key = answer.questionKey as IntroCandidateQuestionKey;
            if (key in draft.answers) {
              draft.answers[key] = answer.answer;
            }
          }

          return [
            member.id,
            {
              ...draft,
              evidence: saved.evidence ?? "",
              mentorQuestions: saved.mentorQuestions ?? "",
              justification: saved.justification ?? "",
              strengths: saved.strengths ?? "",
              opportunities: saved.opportunities ?? "",
              recommendations: saved.recommendations ?? "",
            },
          ];
        }),
      ),
    );

    const note = EMPTY_TEAM_NOTE();

    if (data.teamNote) {
      note.generalNotes = data.teamNote.generalNotes ?? "";

      for (const answer of data.teamNote.answers) {
        const key = answer.questionKey as IntroTeamQuestionKey;
        if (key in note.answers) {
          note.answers[key] = answer.answer;
        }
      }
    }

    setTeamNote(note);
  }, [data, teamId, week]);

  const refresh = async () => {
    await utils.mentor.getWeeklyTracking.invalidate({ teamId, week });
  };

  /*
   * Success is handled per call, not here: the new row's id has to be stamped
   * on the draft before the refetch lands, or the re-seed carries the draft
   * over as an unsaved duplicate of the row it just created.
   */
  const saveObjective = api.mentor.saveWeeklyObjective.useMutation({
    onError: (mutationError) => toast.error(mutationError.message),
    onSettled: () => setSavingKey(null),
  });

  const deleteObjective = api.mentor.deleteWeeklyObjective.useMutation({
    onSuccess: async (_result, variables) => {
      toast.success("Objetivo eliminado.");
      setObjectives((previous) => {
        const next = { ...previous };
        for (const area of INTERVIEW_AREAS) {
          next[area] = (next[area] ?? []).filter(
            (row) => row.id !== variables.objectiveId,
          );
        }
        return next;
      });
      await refresh();
    },
    onError: (mutationError) => toast.error(mutationError.message),
    onSettled: () => setRemovingKey(null),
  });

  const saveReview = api.mentor.saveWeeklyReview.useMutation({
    onSuccess: async () => {
      toast.success("Seguimiento guardado.");
      await refresh();
    },
    onError: (mutationError) => toast.error(mutationError.message),
    onSettled: () => setSavingMemberId(null),
  });

  const saveTeamNote = api.mentor.saveTeamNote.useMutation({
    onSuccess: async () => {
      toast.success("Junta inicial guardada.");
      await refresh();
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const patchObjective = (
    area: AreaKey,
    key: string,
    patch: Partial<ObjectiveDraft>,
  ) =>
    setObjectives((previous) => ({
      ...previous,
      [area]: (previous[area] ?? []).map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft,
      ),
    }));

  const patchScore = (
    area: AreaKey,
    key: string,
    criterion: RubricCriterionKey,
    patch: Partial<ScoreDraft>,
  ) =>
    setObjectives((previous) => ({
      ...previous,
      [area]: (previous[area] ?? []).map((draft) =>
        draft.key === key
          ? {
              ...draft,
              scores: {
                ...draft.scores,
                [criterion]: { ...draft.scores[criterion], ...patch },
              },
            }
          : draft,
      ),
    }));

  const addObjective = (area: AreaKey) =>
    setObjectives((previous) => ({
      ...previous,
      [area]: [...(previous[area] ?? []), emptyObjective()],
    }));

  const removeObjective = (area: AreaKey, draft: ObjectiveDraft) => {
    // An unsaved row never reached the server, so it just goes away.
    if (draft.id === null) {
      setObjectives((previous) => ({
        ...previous,
        [area]: (previous[area] ?? []).filter((row) => row.key !== draft.key),
      }));
      return;
    }

    if (
      !window.confirm(
        "¿Eliminar este objetivo? También se borra su rúbrica.",
      )
    ) {
      return;
    }

    setRemovingKey(draft.key);
    deleteObjective.mutate({ objectiveId: draft.id });
  };

  const submitObjective = (area: AreaKey, draft: ObjectiveDraft) => {
    setSavingKey(draft.key);

    saveObjective.mutate(
      {
        teamId,
        week,
        id: draft.id ?? undefined,
        area,
        candidateId: draft.candidateId,
        objective: draft.objective,
        status: draft.status,
        notes: draft.notes || undefined,
        scores: OBJECTIVE_RUBRIC.flatMap((criterion) => {
          const score = draft.scores[criterion.key];

          return score.level
            ? [
                {
                  criterion: criterion.key,
                  level: score.level,
                  justification: score.justification || undefined,
                },
              ]
            : [];
        }),
      },
      {
        onSuccess: (result) => {
          patchObjective(area, draft.key, { id: result.id });
          toast.success("Objetivo guardado.");
          void refresh();
        },
      },
    );
  };

  const submitReview = (memberId: string, draft: ReviewDraft) => {
    setSavingMemberId(memberId);

    saveReview.mutate({
      teamId,
      week,
      candidateId: memberId,
      evidence: layout.showEvidence ? draft.evidence || undefined : undefined,
      mentorQuestions: layout.showMentorQuestions
        ? draft.mentorQuestions || undefined
        : undefined,
      justification: layout.showAssessment
        ? draft.justification || undefined
        : undefined,
      strengths: layout.showAssessment ? draft.strengths || undefined : undefined,
      opportunities: layout.showAssessment
        ? draft.opportunities || undefined
        : undefined,
      recommendations: layout.showAssessment
        ? draft.recommendations || undefined
        : undefined,
      answers: layout.isIntro
        ? INTRO_CANDIDATE_QUESTIONS.flatMap((question) => {
            const answer = draft.answers[question.key].trim();
            return answer ? [{ questionKey: question.key, answer }] : [];
          })
        : [],
    });
  };

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

  const memberNames = new Map(
    data.team.members.map((member) => [
      member.id,
      member.name ?? member.email ?? "Sin nombre",
    ]),
  );

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* Week picker */}
      {/* ========================================================= */}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-800 p-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{data.team.name}</h2>
          <p className="text-sm text-gray-400">
            {layout.isIntro ? "Junta de introducción" : "Seguimiento semanal"}
          </p>
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
            onClick={() =>
              setWeek((current) => Math.min(MAX_TRACKING_WEEK, current + 1))
            }
            disabled={week >= MAX_TRACKING_WEEK}
            className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
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
      {/* Week 1 only — the intro meeting's team-wide half */}
      {/* ========================================================= */}

      {layout.showIntroMeeting && (
        <IntroMeetingBlock
          draft={teamNote}
          onChange={(patch) =>
            setTeamNote((previous) => ({ ...previous, ...patch }))
          }
          onSave={() =>
            saveTeamNote.mutate({
              teamId,
              week,
              generalNotes: teamNote.generalNotes || undefined,
              answers: INTRO_TEAM_QUESTIONS.flatMap((question) => {
                const answer = teamNote.answers[question.key].trim();
                return answer ? [{ questionKey: question.key, answer }] : [];
              }),
            })
          }
          isSaving={saveTeamNote.isPending}
        />
      )}

      {/* ========================================================= */}
      {/* Last week's objectives, the ones being evaluated now */}
      {/* ========================================================= */}

      {layout.showPreviousObjectives && (
        <PreviousObjectives
          week={week - 1}
          rows={data.previousObjectives}
          memberNames={memberNames}
        />
      )}

      {/* ========================================================= */}
      {/* Block 1 — objectives per area, each with its own rubric */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-200">
          Objetivos de la semana {week}
        </h3>

        <div className="space-y-4">
          {INTERVIEW_AREAS.map((area) => (
            <AreaObjectives
              key={area}
              area={area}
              drafts={objectives[area] ?? []}
              members={data.team.members}
              onChange={(key, patch) => patchObjective(area, key, patch)}
              onScoreChange={(key, criterion, patch) =>
                patchScore(area, key, criterion, patch)
              }
              onAdd={() => addObjective(area)}
              onRemove={(draft) => removeObjective(area, draft)}
              onSave={(draft) => submitObjective(area, draft)}
              savingKey={savingKey}
              removingKey={removingKey}
            />
          ))}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Cada objetivo se guarda por separado, junto con su rúbrica.
        </p>
      </div>

      {/* ========================================================= */}
      {/* Block 2 — per candidate */}
      {/* ========================================================= */}

      {data.team.members.length === 0 ? (
        <p className="rounded-lg bg-gray-800 p-4 text-sm text-gray-400">
          Este equipo todavía no tiene integrantes.
        </p>
      ) : (
        data.team.members.map((member) => (
          <CandidateReview
            key={member.id}
            member={member}
            draft={reviews[member.id] ?? EMPTY_REVIEW()}
            layout={layout}
            onChange={(patch) =>
              setReviews((previous) => ({
                ...previous,
                [member.id]: {
                  ...(previous[member.id] ?? EMPTY_REVIEW()),
                  ...patch,
                },
              }))
            }
            onSave={() =>
              submitReview(member.id, reviews[member.id] ?? EMPTY_REVIEW())
            }
            isSaving={savingMemberId === member.id}
          />
        ))
      )}
    </div>
  );
}
