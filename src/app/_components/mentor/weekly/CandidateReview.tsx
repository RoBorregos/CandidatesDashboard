"use client";

import type { InterviewArea } from "@prisma/client";
import {
  INTRO_CANDIDATE_QUESTIONS,
  INTRO_CANDIDATE_SECTION,
  INTRO_CANDIDATE_SECTION_HINT,
  type IntroCandidateQuestionKey,
  type WeekLayout,
} from "~/lib/intro-meeting";
import { AREA_LABELS } from "~/lib/registration";
import { buttonClass, inputClass } from "./styles";

export type ReviewDraft = {
  evidence: string;
  mentorQuestions: string;
  justification: string;
  strengths: string;
  opportunities: string;
  recommendations: string;
  answers: Record<IntroCandidateQuestionKey, string>;
};

type TextField = keyof Omit<ReviewDraft, "answers">;

const EVIDENCE_FIELDS: readonly (readonly [TextField, string])[] = [
  ["evidence", "Evidencia presentada"],
  ["mentorQuestions", "Preguntas de mentor"],
];

const ASSESSMENT_FIELDS: readonly (readonly [TextField, string])[] = [
  ["justification", "Justificación"],
  ["strengths", "Fortalezas"],
  ["opportunities", "Áreas de oportunidad"],
  ["recommendations", "Recomendaciones de mentor"],
];

/**
 * The weekly follow-up for one candidate. Which fields show up depends on the
 * week: the intro meeting has nothing to evaluate yet, so it asks about the
 * candidate's previous experience instead.
 */
export default function CandidateReview({
  member,
  draft,
  layout,
  onChange,
  onSave,
  isSaving,
}: {
  member: {
    id: string;
    name: string | null;
    email: string | null;
    interviewArea: InterviewArea | null;
  };
  draft: ReviewDraft;
  layout: WeekLayout;
  onChange: (patch: Partial<ReviewDraft>) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const textFields = [
    ...EVIDENCE_FIELDS.filter(([field]) =>
      field === "evidence" ? layout.showEvidence : layout.showMentorQuestions,
    ),
    ...(layout.showAssessment ? ASSESSMENT_FIELDS : []),
  ];

  const setAnswer = (key: IntroCandidateQuestionKey, value: string) =>
    onChange({ answers: { ...draft.answers, [key]: value } });

  return (
    <div className="rounded-lg bg-gray-800 p-4">
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
          onClick={onSave}
          disabled={isSaving}
          className={buttonClass}
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {textFields.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {textFields.map(([field, label]) => (
            <label key={field} className="text-xs text-gray-400">
              {label}
              <textarea
                value={draft[field]}
                onChange={(event) => onChange({ [field]: event.target.value })}
                rows={3}
                className={`mt-1 ${inputClass}`}
              />
            </label>
          ))}
        </div>
      )}

      {layout.isIntro && (
        <div>
          <h4 className="mb-1 text-sm font-semibold text-gray-200">
            {INTRO_CANDIDATE_SECTION}
          </h4>
          <p className="mb-3 text-xs text-gray-500">
            {INTRO_CANDIDATE_SECTION_HINT}
          </p>

          <div className="space-y-3">
            {INTRO_CANDIDATE_QUESTIONS.map((question) => (
              <label key={question.key} className="block text-xs text-gray-400">
                {question.label}
                <textarea
                  value={draft.answers[question.key]}
                  onChange={(event) =>
                    setAnswer(question.key, event.target.value)
                  }
                  rows={3}
                  className={`mt-1 ${inputClass}`}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
