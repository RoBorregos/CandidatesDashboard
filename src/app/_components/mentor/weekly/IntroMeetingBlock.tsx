"use client";

import {
  INTRO_CONTEXT,
  INTRO_TEAM_QUESTIONS,
  INTRO_TEAM_SECTION,
  type IntroTeamQuestionKey,
} from "~/lib/intro-meeting";
import { buttonClass, inputClass } from "./styles";

export type TeamNoteDraft = {
  generalNotes: string;
  answers: Record<IntroTeamQuestionKey, string>;
};

/**
 * Week 1 is the intro meeting: the questions the mentors are meant to ask live
 * here instead of in a separate document, with room to write the answers down.
 */
export default function IntroMeetingBlock({
  draft,
  onChange,
  onSave,
  isSaving,
}: {
  draft: TeamNoteDraft;
  onChange: (patch: Partial<TeamNoteDraft>) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const setAnswer = (key: IntroTeamQuestionKey, value: string) =>
    onChange({ answers: { ...draft.answers, [key]: value } });

  return (
    <div className="rounded-lg bg-gray-800 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-200">Junta inicial</h3>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={buttonClass}
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      <div className="rounded border border-gray-700 bg-gray-900/40 p-3">
        <p className="mb-2 text-xs font-semibold text-gray-300">
          Antes de empezar, cubran esto con el equipo:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-400">
          {INTRO_CONTEXT.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="mb-1 text-sm font-semibold text-gray-200">
          {INTRO_TEAM_SECTION}
        </h4>
        <p className="mb-3 text-xs text-gray-500">
          Preguntas guía sugeridas. Anoten aquí lo que responda el equipo.
        </p>

        <div className="space-y-3">
          {INTRO_TEAM_QUESTIONS.map((question) => (
            <label key={question.key} className="block text-xs text-gray-400">
              {question.label}
              <textarea
                value={draft.answers[question.key]}
                onChange={(event) => setAnswer(question.key, event.target.value)}
                rows={3}
                className={`mt-1 ${inputClass}`}
              />
            </label>
          ))}
        </div>
      </div>

      <label className="mt-4 block text-xs text-gray-400">
        Anotaciones generales
        <textarea
          value={draft.generalNotes}
          onChange={(event) => onChange({ generalNotes: event.target.value })}
          rows={5}
          placeholder="Lo que quieran dejar asentado de la junta."
          className={`mt-1 ${inputClass}`}
        />
      </label>
    </div>
  );
}
