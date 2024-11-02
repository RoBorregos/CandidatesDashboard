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
import { Checkbox } from "rbrgs/app/_components/shadcn/ui/checkbox";
import { challengeCSchema } from "rbrgs/lib/schemas";
import { Input } from "rbrgs/app/_components/shadcn/ui/input";
import Select from "react-select";

import { api } from "~/trpc/react";

type FormData = z.infer<typeof challengeCSchema>;
export type FormControlA = Control<FormData>;

export const FormChallengeC = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(challengeCSchema),
    defaultValues: {
      balancedRamp: false,
      crossedRampWithoutLOP: false,
      crossedRampWithoutTouching: false,
      detectedColors: 0,
      finishedTrack: false,
      passedRamp: false,

      genericFormSchema: {
        obtainedBonus: false,
      },
    },
  });

  const { data: teamIds, isLoading } = api.team.getTeamIds.useQuery();

  const deleteEvaluation = api.judge.roundCDelete.useMutation({
    onSuccess() {
      toast("Se ha borrado la evaluación.");
    },
    onError(error) {
      toast("Hubo un error al borrar la evaluación, checar consola.");
      console.error(error);
    },
  });

  const createEvaluation = api.judge.roundC.useMutation({
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
        className="w-2/3 space-y-6 text-white"
      >
        <FormField
          control={form.control}
          name="detectedColors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of detected colors</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="finishedTrack"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Finished maze</FormLabel>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="ml-3"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="passedRamp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passed ramp</FormLabel>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="ml-3"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="crossedRampWithoutLOP"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Crossed ramp without lack of progress</FormLabel>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="ml-3"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="crossedRampWithoutTouching"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Crossed ramp without touching</FormLabel>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="ml-3"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="balancedRamp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Balanced in ramp</FormLabel>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="ml-3"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="genericFormSchema.obtainedBonus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Obtained Bonus</FormLabel>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="ml-3"
                />
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
