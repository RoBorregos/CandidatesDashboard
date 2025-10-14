import { z } from "zod";
import { Pattern } from "@prisma/client";

export const genericDataSchema = z.object({
  obtainedBonus: z.boolean({
    message: "obtainedBonus must be a boolean",
  }),
  roundTimeSeconds: z.coerce
    .number()
    .int()
    .min(0, { message: "roundTimeSeconds must be greater than or equal to 0" })
    .max(600, {
      message: "roundTimeSeconds must be less than or equal to 600",
    }),
  lackOfProgress: z.coerce.number().int().min(0, {
    message: "lackOfProgress must be greater than or equal to 0",
  }),
  roundId: z.enum(["1", "2", "3"]),
  teamId: z.string().min(1),
});

export const challengeASchema = z.object({
  genericFormSchema: genericDataSchema,
  flagsAccomplished: z.coerce
    .number({
      message: "flagsAccomplished must be an integer",
    })
    .int()
    .min(0, { message: "flagsAccomplished must be at least 0" })
    .max(4, { message: "flagsAccomplished must be at most 4" }),
  finishedTrack: z.boolean({
    message: "finishedTrack must be a boolean",
  }),
});

export const challengeBSchema = z.object({
  genericFormSchema: genericDataSchema,
  // points: z.coerce
  //   .number()
  //   .int()
  //   .min(0, { message: "Los puntos tienen que ser mayor o igual a 0" })
  //   .max(170, { message: "Los puntos tienen que ser menor o igual a 170" }),

  trackData: z.object({
    trackPoints: z.coerce
      .number()
      .int()
      .min(0, {
        message: "Trackpoints must be greater than or equal to 0",
      })
      .max(150, {
        message: "Trackpoints must be less than or equal to 150",
      }),
    patternsPassed: z.array(z.nativeEnum(Pattern)),
  }),
});

export const challengeCSchema = z.object({
  genericFormSchema: genericDataSchema,
  detectedColors: z.coerce
    .number()
    .int()
    .min(0, {
      message: "Los colores detectados tienen que ser mayor o igual a 0",
    })
    .max(13, {
      message: "Los colores detectados tienen que ser menor o igual a 13",
    }),
  finishedTrack: z.boolean({
    message: "finishedTrack tiene que ser un booleano",
  }),
  passedRamp: z.boolean({ message: "passedRamp tiene que ser un booleano" }),
  crossedRampWithoutLOP: z.boolean({
    message: "crossedRampWithoutLOP tiene que ser un booleano",
  }),
  balancedRamp: z.boolean({
    message: "balancedRamp tiene que ser un booleano",
  }),
  crossedRampWithoutTouching: z.boolean({
    message: "crossedRampWithoutTouching tiene que ser un booleano",
  }),
  // points: z.coerce
  //   .number()
  //   .int()
  //   .min(0, { message: "Los puntos tienen que ser mayor o igual a 0" })
  //   .max(250, { message: "Los puntos tienen que ser menor o igual a 250" }),
});
