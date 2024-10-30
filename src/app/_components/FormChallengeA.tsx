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
import { GenericForm } from "./GenericForm";
import { challengeASchema } from "rbrgs/lib/schemas";

type FormData = z.infer<typeof challengeASchema>;
export type FormControlA = Control<FormData>;

export const InputFormA = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(challengeASchema),
    defaultValues: {
      ballContact: false,
      ballSaved: false,
      finishTrack: false,
      finishTrackNoCrossingLine: false,
      genericFormSchema: {
        obtainedBonus: false,
      },
    },
  });

  function onSubmit(data: FormData) {
    toast({
      title: "You submitted the following values:",
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
        <GenericForm control={form.control} />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};
