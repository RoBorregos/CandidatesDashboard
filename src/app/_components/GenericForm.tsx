import { Control } from "react-hook-form";
import { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "rbrgs/app/_components/shadcn/ui/form";
import type { FormControlA, FormControlB } from "./FormChallengeA"; 
import { Input } from "rbrgs/app/_components/shadcn/ui/input";

export const genericFormSchema = z.object({
  roundTimeSeconds: z.coerce
    .number()
    .min(0, { message: "Round time must be a positive number." }),
  points: z.coerce
    .number()
    .min(0, { message: "Points must be a positive number." }),
  lackOfProgress: z.coerce
    .number()
    .min(0, { message: "Lack of progress must be a positive number." }),
  judgeID: z.string().min(1, { message: "Judge ID is required." }),
  teamId: z.string().min(1, { message: "Team ID is required." }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GenericForm = ({ control }: { control: Control<any> }) => {
  return (
    <>
      <FormField
        control={control}
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
        control={control}
        name="genericFormSchema.points"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Points</FormLabel>
            <FormControl>
              <Input type="number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
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
        control={control}
        name="genericFormSchema.judgeID"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Judge ID</FormLabel>
            <FormControl>
              <Input type="text" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="genericFormSchema.teamId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Team ID</FormLabel>
            <FormControl>
              <Input type="text" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
