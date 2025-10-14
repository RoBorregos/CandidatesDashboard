import { z } from "zod";

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

  trackPoints: z.coerce
    .number()
    .int()
    .min(0, {
      message: "Track points must be greater than or equal to 0",
    })
    .max(150, {
      message: "Track points must be less than or equal to 150",
    }),
});

export const challengeCSchema = z.object({
  genericFormSchema: genericDataSchema,
  detectedColors: z.coerce
    .number()
    .int()
    .min(0, {
      message: "Detected colors must be greater than or equal to 0",
    })
    .max(14, {
      message: "Detected colors must be less than or equal to 14",
    }),
  passedObstacles: z.coerce
    .number()
    .int()
    .min(0, {
      message: "Passed obstacles must be greater than or equal to 0",
    })
    .max(4, {
      message: "Passed obstacles must be less than or equal to 4",
    }),
  finishedTrack: z.boolean({
    message: "finishedTrack must be a boolean",
  }),
  passedRamp: z.boolean({ message: "passedRamp must be a boolean" }),
  crossedRampWithoutLOP: z.boolean({
    message: "crossedRampWithoutLOP must be a boolean",
  }),
  crossedRampWithoutTouching: z.boolean({
    message: "crossedRampWithoutTouching must be a boolean",
  }),
  reverseRamp: z.boolean({
    message: "reverseRamp must be a boolean",
  }),
  // points: z.coerce
  //   .number()
  //   .int()
  //   .min(0, { message: "Los puntos tienen que ser mayor o igual a 0" })
  //   .max(250, { message: "Los puntos tienen que ser menor o igual a 250" }),
});
