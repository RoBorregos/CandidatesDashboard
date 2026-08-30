/*
 * The intro meeting (week 1) is not a follow-up: there is nothing to evaluate
 * yet, so the sheet asks for the guide questions the mentors are meant to walk
 * the team through instead of evidence and mentor questions.
 *
 * Like the rubric, the questions live in code and the answers are stored by
 * key, so wording can be fixed without touching the database.
 */

/** The week that is the intro meeting rather than a weekly follow-up. */
export const INTRO_WEEK = 1;

/** Points the mentors have to cover out loud. Shown, never stored. */
export const INTRO_CONTEXT = [
  "Explicar que este proyecto tiene como objetivo principal seleccionar a los nuevos miembros de RoBorregos.",
  "Mencionar que habrá un día de competencia y que se espera que lleven un robot físico que cumpla con los retos planteados.",
  "Asignar roles a cada miembro (mecánica, electrónica, programación) y especificar que será el área en la que se evaluarán sus habilidades técnicas.",
] as const;

export const INTRO_TEAM_SECTION = "Conocerse como equipo";

export const INTRO_TEAM_QUESTIONS = [
  {
    key: "TEAM_MET_BEFORE",
    label: "¿Ya se habían reunido como equipo? ¿Qué han platicado?",
  },
  {
    key: "TEAM_TASK_SPLIT",
    label: "¿Cómo se van a repartir las tareas? ¿Ya tienen algún método para organizarse?",
  },
  {
    key: "TEAM_CHALLENGES",
    label: "¿Qué creen que será lo más retador del proyecto y de trabajar como equipo?",
  },
  {
    key: "TEAM_EXPECTATIONS",
    label: "¿Cuáles son sus expectativas del proyecto? ¿Qué esperan por parte de los mentores?",
  },
] as const;

export const INTRO_CANDIDATE_SECTION = "Experiencia previa";

export const INTRO_CANDIDATE_SECTION_HINT =
  "Saber con qué conocimiento cuenta cada Candidate que le pueda beneficiar para el desarrollo del proyecto. Esta parte es clave para las evaluaciones posteriores de los objetivos que se planteen.";

export const INTRO_CANDIDATE_QUESTIONS = [
  {
    key: "EXP_TECH_PROJECTS",
    label: "¿Han trabajado anteriormente en proyectos técnicos? ¿Qué tipo de proyectos?",
  },
  {
    key: "EXP_COMPETITIONS",
    label: "¿Han participado en competencias anteriormente?",
  },
  {
    key: "EXP_TEAMWORK",
    label: "¿Han trabajado en equipos para desarrollar algún proyecto?",
  },
  {
    key: "EXP_AREA",
    label:
      "¿Qué experiencia tienen específicamente en el área que eligieron? ¿Qué conocimiento tienen que les pueda servir para este proyecto?",
  },
] as const;

export type IntroTeamQuestionKey = (typeof INTRO_TEAM_QUESTIONS)[number]["key"];

export type IntroCandidateQuestionKey =
  (typeof INTRO_CANDIDATE_QUESTIONS)[number]["key"];

export const INTRO_TEAM_QUESTION_KEYS = INTRO_TEAM_QUESTIONS.map(
  (question) => question.key,
) as unknown as [IntroTeamQuestionKey, ...IntroTeamQuestionKey[]];

export const INTRO_CANDIDATE_QUESTION_KEYS = INTRO_CANDIDATE_QUESTIONS.map(
  (question) => question.key,
) as unknown as [IntroCandidateQuestionKey, ...IntroCandidateQuestionKey[]];

/*
 * The single source of truth for how a week differs from the others, so the
 * blocks on screen can't disagree about what week 1 is.
 */
export function weekLayout(week: number) {
  const isIntro = week === INTRO_WEEK;

  return {
    isIntro,
    showPreviousObjectives: week > INTRO_WEEK,
    /** "Evidencia presentada" — nothing has been presented in week 1. */
    showEvidence: !isIntro,
    /** "Preguntas de mentor" — week 1 has its own guide questions instead. */
    showMentorQuestions: !isIntro,
    /** Justificación, fortalezas, áreas de oportunidad, recomendaciones. */
    showAssessment: !isIntro,
    /** Guide questions plus the mentors' general notes. */
    showIntroMeeting: isIntro,
  };
}

export type WeekLayout = ReturnType<typeof weekLayout>;
