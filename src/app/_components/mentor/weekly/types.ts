import type { ObjectiveStatusValue, RubricCriterionKey, RubricLevelValue } from "~/lib/rubric";
import { OBJECTIVE_RUBRIC } from "~/lib/rubric";

export type ScoreDraft = { level: RubricLevelValue | null; justification: string };

/*
 * One row of the objectives block. `key` is a client-side id that survives a
 * refetch, so React keys and radio group names stay put while the mentor types;
 * `id` is null until the row has been saved for the first time.
 */
export type ObjectiveDraft = {
  key: string;
  id: string | null;
  candidateId: string | null;
  objective: string;
  status: ObjectiveStatusValue | null;
  notes: string;
  scores: Record<RubricCriterionKey, ScoreDraft>;
};

export const emptyScores = () =>
  Object.fromEntries(
    OBJECTIVE_RUBRIC.map((criterion) => [
      criterion.key,
      { level: null, justification: "" },
    ]),
  ) as Record<RubricCriterionKey, ScoreDraft>;

export const emptyObjective = (): ObjectiveDraft => ({
  key: crypto.randomUUID(),
  id: null,
  candidateId: null,
  objective: "",
  status: null,
  notes: "",
  scores: emptyScores(),
});
