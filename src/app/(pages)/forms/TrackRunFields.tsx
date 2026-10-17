"use client";

import Select from "react-select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "rbrgs/app/_components/shadcn/ui/form";
import { Input } from "rbrgs/app/_components/shadcn/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "rbrgs/app/_components/shadcn/ui/radio-group";
import { MAX_RUN_SECONDS, ROUND_NUMBERS } from "rbrgs/lib/scoring";
import { api } from "~/trpc/react";
import type { Control, FieldValues, Path, PathValue } from "react-hook-form";

/** Fields every 2026 track form shares: round, team, run time and LOP. */
type TrackRunFieldValues = {
  round: number;
  teamId: string;
  runSeconds: number;
  lackOfProgress: number;
};

export function TrackRunFields<T extends FieldValues & TrackRunFieldValues>({
  control,
  onTeamChange,
}: {
  control: Control<T>;
  onTeamChange: (teamId: string) => void;
}) {
  const { data: teamIds, isLoading } = api.team.getTeamIds.useQuery();
  const options = teamIds?.map((team) => ({
    value: team.id,
    label: team.name,
  }));

  return (
    <>
      <FormField
        control={control}
        name={"runSeconds" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Run time</FormLabel>
            <FormDescription>
              In seconds, without the 2 minutes of calibration (max{" "}
              {MAX_RUN_SECONDS}).
            </FormDescription>
            <FormControl>
              <Input type="number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={"lackOfProgress" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Lack of progress</FormLabel>
            <FormDescription>
              Recorded for reference only: it gives no points in 2026.
            </FormDescription>
            <FormControl>
              <Input type="number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={"round" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Round</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(value) =>
                  field.onChange(Number(value) as PathValue<T, Path<T>>)
                }
                defaultValue={String(field.value)}
                className="flex flex-row gap-6"
              >
                {ROUND_NUMBERS.map((round) => (
                  <FormItem key={round} className="flex items-center gap-2">
                    <FormControl>
                      <RadioGroupItem value={String(round)} />
                    </FormControl>
                    <FormLabel className="font-normal">{round}</FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={"teamId" as Path<T>}
        render={() => (
          <FormItem>
            <FormLabel>Team</FormLabel>
            <FormControl>
              <Select
                className="basic-single"
                classNamePrefix="select"
                placeholder="Choose a team"
                isLoading={isLoading}
                isClearable={true}
                isSearchable={true}
                onChange={(option) => onTeamChange(option?.value ?? "")}
                options={options ?? []}
                styles={{
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: "black",
                    color: "white",
                    cursor: "pointer",
                  }),
                  menu: (provided) => ({ ...provided, backgroundColor: "black" }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused ? "#333" : "black",
                    color: "white",
                    cursor: "pointer",
                  }),
                  singleValue: (provided) => ({ ...provided, color: "white" }),
                  placeholder: (provided) => ({ ...provided, color: "white" }),
                  input: (provided) => ({ ...provided, color: "white" }),
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

/** Live subtotal shown while the judge fills the form. */
export function PointsPreview({ points, max }: { points: number; max: number }) {
  return (
    <div className="sticky top-20 z-10 rounded border border-roboblue bg-black/90 p-3 text-center">
      <span className="text-sm uppercase tracking-widest text-neutral-400">
        Subtotal
      </span>
      <p className="font-digital text-5xl text-roboblue">
        {points}
        <span className="text-2xl text-neutral-500"> / {max}</span>
      </p>
    </div>
  );
}
