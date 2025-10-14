"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Control, useForm } from "react-hook-form";
import { z } from "zod";

import { toast } from "sonner";
import { Button } from "~/app/_components/shadcn/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "rbrgs/app/_components/shadcn/ui/form";
import {
  RadioGroup,
  RadioGroupItem,
} from "rbrgs/app/_components/shadcn/ui/radio-group";
import { challengeBSchema } from "rbrgs/lib/schemas";
import { Input } from "rbrgs/app/_components/shadcn/ui/input";
import Select from "react-select";
import { api } from "~/trpc/react";
import { PatternGrid } from "rbrgs/app/_components/pattern";
import { useState } from "react";
import { Pattern } from "@prisma/client";

type FormData = z.infer<typeof challengeBSchema>;
export type FormControlA = Control<FormData>;

export const FormChallengeB = () => {
  const [trackPoints, setTrackPoints] = useState(0);
  const [patterns, setPatterns] = useState<Pattern[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(challengeBSchema),
    defaultValues: {
      trackPoints: {
        trackPoints: 0,
        patternsPassed: [],
      },
      genericFormSchema: {
        obtainedBonus: false,
        roundId: "1",
      },
    },
  });

  const { data: teamIds, isLoading } = api.team.getTeamIds.useQuery();

  const deleteEvaluation = api.judge.roundBDelete.useMutation({
    onSuccess() {
      toast("Se ha borrado la evaluación.");
    },
    onError(error) {
      toast("Hubo un error al borrar la evaluación, checar consola.");
      console.error(error);
    },
  });

  const createEvaluation = api.judge.roundB.useMutation({
    onSuccess(data) {
      toast("Se ha procesado la evaluación!", {
        description: <p>Puntos calculados: {data.points}</p>,
        action: {
          label: "Undo",
          onClick: () => deleteEvaluation.mutate({ id: data.id }),
        },
      });
    },
    onError(error) {
      toast("Hubo un error al crear la evaluación, checar consola.");
      console.error(error);
    },
  });

  const processedTeamIds = teamIds?.map((team) => ({
    value: team.id,
    label: team.name,
  }));

  function onSubmit(data: FormData) {
    createEvaluation.mutate(data);
    toast("Se ha enviado la evaluación!", {
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4 text-white">
          {JSON.stringify(data, null, 2)}
        </pre>
      ),
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-6 text-white"
      >
        <FormField
          control={form.control}
          name="trackPoints"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Track Points</FormLabel>
              <PatternGrid
                patterns={field.value.patternsPassed}
                trackPoints={field.value.trackPoints}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="genericFormSchema.roundTimeSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Round Time (Seconds)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="genericFormSchema.lackOfProgress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lack of Progress</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="genericFormSchema.roundId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Round ID</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value.toString()}
                  className="flex flex-col"
                >
                  {[1, 2, 3].map((value) => (
                    <FormItem key={value} className="flex items-center gap-3">
                      <FormControl>
                        <RadioGroupItem value={value.toString()} />
                      </FormControl>
                      <FormLabel className="font-normal">{value}</FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="genericFormSchema.teamId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team</FormLabel>
              <FormControl>
                <Select
                  className="basic-single"
                  classNamePrefix="select"
                  defaultValue={{ value: "", label: "Elegir un equipo" }}
                  isLoading={isLoading}
                  isClearable={true}
                  isSearchable={true}
                  onChange={(option) => {
                    form.setValue(
                      "genericFormSchema.teamId",
                      option?.value ?? "",
                    );
                  }}
                  options={processedTeamIds ?? []}
                  styles={{
                    control: (provided) => ({
                      ...provided,
                      backgroundColor: "black",
                      color: "white",
                      cursor: "pointer",
                    }),
                    menu: (provided) => ({
                      ...provided,
                      backgroundColor: "black",
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isFocused ? "#333" : "black",
                      color: "white",
                      cursor: "pointer",
                    }),
                    singleValue: (provided) => ({
                      ...provided,
                      color: "white",
                    }),
                    placeholder: (provided) => ({
                      ...provided,
                      color: "white",
                    }),
                    input: (provided) => ({
                      ...provided,
                      color: "white",
                    }),
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};
