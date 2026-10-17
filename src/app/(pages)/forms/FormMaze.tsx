"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import { toast } from "sonner";

import { Button } from "~/app/_components/shadcn/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "rbrgs/app/_components/shadcn/ui/form";
import { Checkbox } from "rbrgs/app/_components/shadcn/ui/checkbox";
import { Input } from "rbrgs/app/_components/shadcn/ui/input";
import { mazeRunSchema } from "rbrgs/lib/schemas";
import {
  computeMazePoints,
  MAZE_LIMITS,
  MAZE_MAX_POINTS,
  MAZE_POINTS,
} from "rbrgs/lib/scoring";
import { api } from "~/trpc/react";
import { PointsPreview, TrackRunFields } from "./TrackRunFields";

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
    name: "arucoMarkers",
    label: "BONUS 2: ArUco markers whose ID was reported correctly",
    max: MAZE_LIMITS.arucoMarkers,
    points: MAZE_POINTS.arucoMarker,
  },
] as const;

const CHECK_FIELDS = [
  { name: "reachedFinalCheckpoint", label: "Reached the final checkpoint", points: MAZE_POINTS.finalCheckpoint },
  { name: "returnBonus", label: "BONUS 1: returned along the same path to the start", points: MAZE_POINTS.returnBonus },
] as const;

/** Judge form for Pista A (MAZE), 2026 rubric. */
export const FormMaze = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(mazeRunSchema),
    defaultValues: {
      round: 1,
      teamId: "",
      runSeconds: 0,
      lackOfProgress: 0,
      detectedColors: 0,
      speedbumps: 0,
      reachedFinalCheckpoint: false,
      returnBonus: false,
      arucoMarkers: 0,
    },
  });

  const values = form.watch();
  const subtotal = computeMazePoints({
    detectedColors: Number(values.detectedColors) || 0,
    speedbumps: Number(values.speedbumps) || 0,
    reachedFinalCheckpoint: values.reachedFinalCheckpoint,
    returnBonus: values.returnBonus,
    arucoMarkers: Number(values.arucoMarkers) || 0,
  });

  const deleteRun = api.judge.mazeRunDelete.useMutation({
    onSuccess: () => toast("The evaluation was deleted."),
    onError(error) {
      toast("Could not delete the evaluation, check the console.");
      console.error(error);
    },
  });

  const createRun = api.judge.mazeRun.useMutation({
    onSuccess(data) {
      toast("Evaluation saved!", {
        description: <p>Points: {data.points}</p>,
        action: {
          label: "Undo",
          onClick: () => deleteRun.mutate({ id: data.id }),
        },
      });
    },
    onError(error) {
      toast("Could not save the evaluation, check the console.");
      console.error(error);
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => createRun.mutate(data))}
        className="space-y-6 text-white"
      >
        <PointsPreview points={subtotal} max={MAZE_MAX_POINTS} />

        {COUNT_FIELDS.map(({ name, label, max, points }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormDescription>
                  {points} points each, up to {max}.
                </FormDescription>
                <FormControl>
                  <Input type="number" min={0} max={max} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        {CHECK_FIELDS.map(({ name, label, points }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>
                    {label} <span className="text-neutral-400">(+{points})</span>
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <TrackRunFields
          control={form.control}
          onTeamChange={(teamId) => form.setValue("teamId", teamId)}
        />

        <Button type="submit" disabled={createRun.isPending}>
          Submit
        </Button>
      </form>
    </Form>
  );
};
