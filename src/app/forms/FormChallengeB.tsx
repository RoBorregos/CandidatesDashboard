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
import { challengeBSchema } from "rbrgs/lib/schemas";
import { Input } from "rbrgs/app/_components/shadcn/ui/input";
import Select from "react-select";

import { api } from "~/trpc/react";

type FormData = z.infer<typeof challengeBSchema>;
export type FormControlA = Control<FormData>;

export const FormChallengeB = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(challengeBSchema),
    defaultValues: {
      trackPoints: 0,
      genericFormSchema: {
        obtainedBonus: false,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
        <FormField
          control={form.control}
          name="trackPoints"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Track Points (total)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
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
                <Input type="string" {...field} />
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
                  className="basic-single text-black"
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
                    }),
                    menu: (provided) => ({
                      ...provided,
                      backgroundColor: "black",
                    }),
                    singleValue: (provided) => ({
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
