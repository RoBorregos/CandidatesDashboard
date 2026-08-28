/*
 * Weekly mentor tracking, transcribed from the mentors' spreadsheet.
 *
 * The criteria and their level descriptions live here rather than in the
 * database: they change once a year at most, and keeping them out of the DB
 * means a saved evaluation can never point at a criterion that was edited or
 * deleted underneath it.
 */

export const RUBRIC_LEVELS = [
  { value: "LOW", label: "Deficiente/Bajo" },
  { value: "DEVELOPING", label: "En desarrollo" },
  { value: "ADEQUATE", label: "Adecuado" },
  { value: "OUTSTANDING", label: "Sobresaliente" },
] as const;

export type RubricLevelValue = (typeof RUBRIC_LEVELS)[number]["value"];

export const OBJECTIVE_RUBRIC = [
  {
    key: "CLARITY",
    label: "Claridad",
    levels: {
      LOW: "El objetivo es ambiguo, superficial, el Candidate no presenta mucho entendimiento de qué es lo que tiene que hacer.",
      DEVELOPING:
        "Se entiende parcialmente lo que se quiere lograr pero falta claridad.",
      ADEQUATE: "Es específico y se puede determinar si fue cumplido o no.",
      OUTSTANDING:
        "El objetivo es específico, verificable y tiene criterios para determinar si se cumplió o no. El Candidate entiende cuál es el reto que tiene que resolver y tiene metas claras para resolverlo.",
    },
  },
  {
    key: "RELEVANCE",
    label: "Relevancia",
    levels: {
      LOW: "Tiene poca o ninguna relación con el objetivo del equipo.",
      DEVELOPING: "Aporta al proyecto, pero su impacto es limitado.",
      ADEQUATE: "Es necesario o importante para el avance del área/equipo.",
      OUTSTANDING:
        "El objetivo es específico, verificable y tiene criterios para determinar si se cumplió o no. El Candidate entiende cuál es el reto que tiene que resolver y tiene metas claras para resolverlo.",
    },
  },
  {
    key: "DIFFICULTY",
    label: "Dificultad del reto",
    levels: {
      LOW: "El objetivo está claramente por debajo de su capacidad o experiencia. El objetivo es muy inviable, no es realista alcanzarlo en el tiempo establecido.",
      DEVELOPING: "Representa poco reto.",
      ADEQUATE:
        "Representa un reto razonable considerando su experiencia y el tiempo disponible.",
      OUTSTANDING:
        "Representa un reto significativo y razonable para su nivel, y tiene viabilidad para cumplirlo.",
    },
  },
] as const;

export type RubricCriterionKey = (typeof OBJECTIVE_RUBRIC)[number]["key"];

export const RUBRIC_CRITERION_KEYS = OBJECTIVE_RUBRIC.map(
  (criterion) => criterion.key,
) as unknown as [RubricCriterionKey, ...RubricCriterionKey[]];

export const RUBRIC_LEVEL_VALUES = RUBRIC_LEVELS.map(
  (level) => level.value,
) as unknown as [RubricLevelValue, ...RubricLevelValue[]];
