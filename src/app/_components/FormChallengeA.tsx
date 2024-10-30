"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Control, useForm } from "react-hook-form";
import { z } from "zod";

import { toast } from "~/app/_components/shadcn/hooks/use-toast";
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
import { genericFormSchema, GenericForm } from "./GenericForm";

const formSchema = z.object({
  ballContact: z.boolean({ message: "You must select a value." }),
  ballSaved: z.boolean({ message: "You must select a value." }),
  finishTrack: z.boolean({ message: "You must select a value." }),
  finishTrackNoCrossingLine: z.boolean({ message: "You must select a value." }),
  obtainedBonus: z.boolean({ message: "You must select a value." }),
  genericFormSchema: genericFormSchema,
});

const formSchemaB = z.object({
  points: z.number({ message: "You must select a value." }),
  genericFormSchema: genericFormSchema,
});

type FormData = z.infer<typeof formSchema>;
export type FormControlA = Control<FormData>;

type FormDataB = z.infer<typeof formSchemaB>;
export type FormControlB = Control<FormDataB>;

export const InputFormA = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ballContact: false,
      ballSaved: false,
      finishTrack: false,
      finishTrackNoCrossingLine: false,
      obtainedBonus: false,
      genericFormSchema: {
        roundTimeSeconds: 0,
        points: 0,
        lackOfProgress: 0,
        judgeID: "",
        teamId: "",
      },
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
        <FormField
          control={form.control}
          name="ballContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ball Contact</FormLabel>
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
          name="ballSaved"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ball Saved</FormLabel>
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
          name="finishTrack"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Finish Track</FormLabel>
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
          name="finishTrackNoCrossingLine"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Finish Track No Crossing Line</FormLabel>
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
          name="obtainedBonus"
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
        <GenericForm control={form.control} />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};
