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
import {
  RadioGroup,
  RadioGroupItem,
} from "rbrgs/app/_components/shadcn/ui/radio-group";
import { levelsRunSchema } from "rbrgs/lib/schemas";
import {
  CHECKPOINT_RESULTS,
  computeLevelsPoints,
  LEVELS_MAX_POINTS,
  LEVELS_POINTS,
} from "rbrgs/lib/scoring";
import { api } from "~/trpc/react";
import { PointsPreview, TrackRunFields } from "./TrackRunFields";

type FormData = z.infer<typeof levelsRunSchema>;

const SECTIONS = [
  { name: "section1", label: "Section 1 checkpoint (hidden ball)" },
  { name: "section2", label: "Section 2 checkpoint (white lines)" },
  {
    name: "section3",
    label: "Final checkpoint, Section 3 (color path) — WITH the ball is the bonus",
  },
] as const;

/** Judge form for Pista B (Niveles), 2026 rubric. */
export const FormLevels = () => {
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

  const values = form.watch();
  const subtotal = computeLevelsPoints(values);

  const deleteRun = api.judge.levelsRunDelete.useMutation({
    onSuccess: () => toast("The evaluation was deleted."),
    onError(error) {
      toast("Could not delete the evaluation, check the console.");
      console.error(error);
    },
  });

  const createRun = api.judge.levelsRun.useMutation({
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
        <PointsPreview points={subtotal} max={LEVELS_MAX_POINTS} />

        <FormField
          control={form.control}
          name="tookBall"
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
                  Took the ball out of its hidden unit (Section 1){" "}
                  <span className="text-neutral-400">
                    (+{LEVELS_POINTS.ballPossession})
                  </span>
                </FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {SECTIONS.map(({ name, label }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormDescription>
                  Possession means more than 50% of the ball inside the robot.
                  A checkpoint reached by skipping after the 4th lack of
                  progress scores nothing: mark it as not reached.
                </FormDescription>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col"
                  >
                    {CHECKPOINT_RESULTS.map((result) => (
                      <FormItem
                        key={result.value}
                        className="flex items-center gap-3"
                      >
                        <FormControl>
                          <RadioGroupItem value={result.value} />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {result.label}{" "}
                          <span className="text-neutral-400">
                            (+{LEVELS_POINTS[name][result.value]})
                          </span>
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
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
