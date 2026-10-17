"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import { toast } from "sonner";

import { mazeRunSchema } from "rbrgs/lib/schemas";
import {
  computeMazePoints,
  MAZE_LIMITS,
  MAZE_MAX_POINTS,
  MAZE_POINTS,
} from "rbrgs/lib/scoring";
import { api } from "~/trpc/react";
import { CounterButton, ToggleButton } from "./ScoreButtons";
import {
  ManualRunFields,
  RunHeader,
  SubmitRunButton,
  useTrackRun,
} from "./TrackRunFields";

type FormData = z.infer<typeof mazeRunSchema>;

const COUNT_FIELDS = [
  {
    name: "detectedColors",
    label: "Detected colors (shown with LEDs, display...)",
    max: MAZE_LIMITS.detectedColors,
    points: MAZE_POINTS.detectedColor,
  },
  {
    name: "speedbumps",
    label: "Speedbumps fully crossed",
    max: MAZE_LIMITS.speedbumps,
    points: MAZE_POINTS.speedbump,
  },
  {
    name: "staircases",
    label: "Staircases climbed and descended",
    max: MAZE_LIMITS.staircases,
    points: MAZE_POINTS.staircase,
  },
] as const;

const CHECK_FIELDS = [
  {
    name: "crossedRamp",
    label: "Crossed the ramp (up and down)",
    points: MAZE_POINTS.ramp,
  },
  {
    name: "reachedFinalCheckpoint",
    label: "Reached the final checkpoint",
    points: MAZE_POINTS.finalCheckpoint,
  },
  {
    name: "returnBonus",
    label: "BONUS 1: returned along the same path to the start",
    points: MAZE_POINTS.returnBonus,
  },
  {
    name: "arucoBonus",
    label: "BONUS 2: reported the ArUco marker ID correctly",
    points: MAZE_POINTS.arucoBonus,
  },
] as const;

/** Judge form for Pista A (MAZE), 2026 rubric. */
export const FormMaze = ({ lane }: { lane: string }) => {
  const form = useForm<FormData>({
    resolver: zodResolver(mazeRunSchema),
    defaultValues: {
      round: 1,
      teamId: "",
      runSeconds: 0,
      lackOfProgress: 0,
      detectedColors: 0,
      speedbumps: 0,
      staircases: 0,
      crossedRamp: false,
      reachedFinalCheckpoint: false,
      returnBonus: false,
      arucoBonus: false,
    },
  });
  const run = useTrackRun(form, lane);

  const values = form.watch();
  const subtotal = computeMazePoints(values);

  const deleteRun = api.judge.mazeRunDelete.useMutation({
    onSuccess: () => {
      toast("The evaluation was deleted.");
      run.refreshLineup();
    },
    onError(error) {
      toast("Could not delete the evaluation, check the console.");
      console.error(error);
    },
  });

  const createRun = api.judge.mazeRun.useMutation({
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
        (data) => {
          // Backs out when the judge declines to save a 0-second run time.
          const runSeconds = run.confirmRunSeconds();
          if (runSeconds === null) return;
          createRun.mutate({ ...data, runSeconds });
        },
        (errors) =>
          toast(
            Object.values(errors)[0]?.message?.toString() ??
              "Check the evaluation before submitting.",
          ),
      )}
      className="space-y-6 text-white"
    >
      <RunHeader run={run} points={subtotal} max={MAZE_MAX_POINTS} />

      <div className="grid gap-3 sm:grid-cols-2">
        {COUNT_FIELDS.map(({ name, label, max, points }) => (
          <CounterButton
            key={name}
            label={label}
            count={values[name]}
            max={max}
            points={points}
            onChange={(count) => form.setValue(name, count)}
          />
        ))}
        <CounterButton
          label="Lack of progress (reference only, no points)"
          count={values.lackOfProgress}
          onChange={(count) => form.setValue("lackOfProgress", count)}
        />
      </div>

      <div className="space-y-3">
        {CHECK_FIELDS.map(({ name, label, points }) => {
          // The return trip starts at the final checkpoint (see the schema).
          const locked =
            name === "returnBonus" && !values.reachedFinalCheckpoint;
          return (
            <ToggleButton
              key={name}
              label={label}
              points={points}
              checked={values[name]}
              disabled={locked}
              hint={locked ? "Needs the final checkpoint first" : undefined}
              onChange={(checked) => {
                form.setValue(name, checked);
                if (name === "reachedFinalCheckpoint" && !checked) {
                  form.setValue("returnBonus", false);
                }
              }}
            />
          );
        })}
      </div>

      <ManualRunFields run={run} />

      <SubmitRunButton
        run={run}
        points={subtotal}
        pending={createRun.isPending}
      />
    </form>
  );
};
