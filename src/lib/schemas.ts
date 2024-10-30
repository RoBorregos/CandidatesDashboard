import { z } from "zod";

const genericDataSchema = z.object({
  obtainedBonus: z.boolean({
    message: "obtainedBonus tiene que ser un booleano",
  }),
  roundTimeSeconds: z
    .number()
    .int()
    .min(0, { message: "El tiempo tiene que ser mayor a 0" })
    .max(600, { message: "El tiempo tiene que ser menor a 600" }),
  roundId: z.string().min(1),
  lackOfProgress: z
    .number()
    .int()
    .min(0, { message: "La falta de progreso tiene que ser mayor a 0" }),
  teamId: z.string().min(1),
});

export const challengeASchema = z.object({
  ...genericDataSchema.shape,
  ballContact: z.boolean({ message: "ballContact tiene que ser un booleano" }),
  ballSaved: z.boolean({ message: "ballSaved tiene que ser un booleano" }),
  finshTrack: z.boolean({ message: "finshTrack tiene que ser un booleano" }),
  finishTrackNoCrossingLine: z.boolean({
    message: "finishTrackNoCrossingLine tiene que ser un booleano",
  }),
  // points: z
  //   .number()
  //   .int()
  //   .min(0, { message: "Los puntos tienen que ser mayor o igual a 0" })
  //   .max(170, { message: "Los puntos tienen que ser menor o igual a 170" }),
});

export const challengeBSchema = z.object({
  ...genericDataSchema.shape,
  // points: z
  //   .number()
  //   .int()
  //   .min(0, { message: "Los puntos tienen que ser mayor o igual a 0" })
  //   .max(170, { message: "Los puntos tienen que ser menor o igual a 170" }),

  trackPoints: z
    .number()
    .int()
    .min(0, {
      message: "Los puntos de la pista tienen que ser mayor o igual 0",
    })
    .max(150, {
      message: "Los puntos de la pista tienen que ser menor o igual a 150",
    }),
});

export const challengeCSchema = z.object({
  ...genericDataSchema.shape,
  detectedColors: z
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
  obtainedBonus: z.boolean({
    message: "obtainedBonus tiene que ser un booleano",
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
  // points: z
  //   .number()
  //   .int()
  //   .min(0, { message: "Los puntos tienen que ser mayor o igual a 0" })
  //   .max(250, { message: "Los puntos tienen que ser menor o igual a 250" }),
});