"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import { toast } from "sonner";

import { levelsRunSchema } from "rbrgs/lib/schemas";
import {
  CHECKPOINT_RESULTS,
  computeLevelsPoints,
  LEVELS_MAX_POINTS,
  LEVELS_POINTS,
} from "rbrgs/lib/scoring";
import { api } from "~/trpc/react";
import { ChoiceButtons, CounterButton, ToggleButton } from "./ScoreButtons";
import {
  ManualRunFields,
  RunHeader,
  SubmitRunButton,
  useTrackRun,
} from "./TrackRunFields";

type FormData = z.infer<typeof levelsRunSchema>;

const SECTIONS = [
  { name: "section1", label: "Section 1 checkpoint (hidden ball)" },
  { name: "section2", label: "Section 2 checkpoint (white lines)" },
  {
    name: "section3",
    label:
      "Final checkpoint, Section 3 (color path) — WITH the ball is the bonus",
  },
] as const;

/** Judge form for Pista B (Niveles), 2026 rubric. */
export const FormLevels = ({ lane }: { lane: string }) => {
  const form = useForm<FormData>({
    resolver: zodResolver(levelsRunSchema),
    defaultValues: {
      round: 1,
      teamId: "",
      runSeconds: 0,
      lackOfProgress: 0,
      tookBall: false,
      section1: "NOT_REACHED",
      section2: "NOT_REACHED",
      section3: "NOT_REACHED",
    },
  });
  const run = useTrackRun(form, lane);

  const values = form.watch();
  const subtotal = computeLevelsPoints(values);

  const deleteRun = api.judge.levelsRunDelete.useMutation({
    onSuccess: () => {
      toast("The evaluation was deleted.");
      run.refreshLineup();
    },
    onError(error) {
      toast("Could not delete the evaluation, check the console.");
      console.error(error);
    },
  });

  const createRun = api.judge.levelsRun.useMutation({
    onSuccess(data) {
      const key = run.markSubmitted();
      toast("Evaluation saved!", {
        description: <p>Points: {data.points}</p>,
        action: {
          label: "Undo",
          onClick: () => {
            deleteRun.mutate({ id: data.id });
            run.unmarkSubmitted(key);
          },
        },
      });
    },
    onError(error) {
      toast("Could not save the evaluation, check the console.");
      console.error(error);
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(
        (data) => createRun.mutate({ ...data, runSeconds: run.runSeconds() }),
        (errors) =>
          toast(
            Object.values(errors)[0]?.message?.toString() ??
              "Check the evaluation before submitting.",
          ),
      )}
      className="space-y-6 text-white"
    >
      <RunHeader run={run} points={subtotal} max={LEVELS_MAX_POINTS} />

      <ToggleButton
        label="Took the ball out of its hidden unit (Section 1)"
        points={LEVELS_POINTS.ballPossession}
        checked={values.tookBall}
        onChange={(checked) => form.setValue("tookBall", checked)}
      />

      {SECTIONS.map(({ name, label }) => (
        <ChoiceButtons
          key={name}
          label={label}
          options={CHECKPOINT_RESULTS.map((result) => ({
            ...result,
            points: LEVELS_POINTS[name][result.value],
          }))}
          value={values[name]}
          onChange={(value) => form.setValue(name, value)}
        />
      ))}
      <p className="text-xs text-neutral-400">
        Possession means more than 50% of the ball inside the robot. A
        checkpoint reached by skipping after the 4th lack of progress scores
        nothing: mark it as not reached.
      </p>

      <CounterButton
        label="Lack of progress (reference only, no points)"
        count={values.lackOfProgress}
        onChange={(count) => form.setValue("lackOfProgress", count)}
      />

      <ManualRunFields run={run} />

      <SubmitRunButton
        run={run}
        points={subtotal}
        pending={createRun.isPending}
      />
    </form>
  );
};
