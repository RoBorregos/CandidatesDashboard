import { Control } from "react-hook-form";
import { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "rbrgs/app/_components/shadcn/ui/form";
import { Input } from "rbrgs/app/_components/shadcn/ui/input";
import { Checkbox } from "./shadcn/ui/checkbox";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GenericForm = ({ control }: { control: Control<any> }) => {
  return (
    <>
      {/* <FormField
        control={control}
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
      /> */}
    </>
  );
};
