import { z } from "zod";
import { Pattern } from "@prisma/client";
import {
  CHECKPOINT_RESULT_VALUES,
  MAX_RUN_SECONDS,
  MAZE_LIMITS,
  ROUND_NUMBERS,
} from "rbrgs/lib/scoring";

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
  lackOfProgress: z.coerce.number().int().min(-1, {
    message: "lackOfProgress must be greater than or equal to -1",
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

/*
 * 2026 judging forms (Pista A: MAZE, Pista B: Niveles). Limits come from
 * ~/lib/scoring so the forms, the router and the rubric cannot disagree.
 */
export const trackRunBaseSchema = z.object({
  round: z.coerce
    .number()
    .int()
    .refine((round) => (ROUND_NUMBERS as readonly number[]).includes(round), {
      message: "round must be 1, 2 or 3",
    }),
  teamId: z.string().min(1, { message: "Select a team" }),
  runSeconds: z.coerce
    .number()
    .int()
    .min(0, { message: "Run time must be at least 0" })
    .max(MAX_RUN_SECONDS, {
      message: `Run time must be at most ${MAX_RUN_SECONDS} seconds`,
    }),
  lackOfProgress: z.coerce
    .number()
    .int()
    .min(0, { message: "Lack of progress must be at least 0" }),
});

export const mazeRunSchema = trackRunBaseSchema
  .extend({
    detectedColors: z.coerce
      .number()
      .int()
      .min(0)
      .max(MAZE_LIMITS.detectedColors, {
        message: `At most ${MAZE_LIMITS.detectedColors} colors`,
      }),
    speedbumps: z.coerce
      .number()
      .int()
      .min(0)
      .max(MAZE_LIMITS.speedbumps, {
        message: `At most ${MAZE_LIMITS.speedbumps} speedbumps`,
      }),
    reachedFinalCheckpoint: z.boolean(),
    returnBonus: z.boolean(),
    arucoMarkers: z.coerce
      .number()
      .int()
      .min(0)
      .max(MAZE_LIMITS.arucoMarkers, {
        message: `At most ${MAZE_LIMITS.arucoMarkers} ArUco markers`,
      }),
  })
  .refine((run) => !run.returnBonus || run.reachedFinalCheckpoint, {
    message: "The return bonus requires reaching the final checkpoint",
    path: ["returnBonus"],
  });

export const levelsRunSchema = trackRunBaseSchema.extend({
  tookBall: z.boolean(),
  section1: z.enum(CHECKPOINT_RESULT_VALUES),
  section2: z.enum(CHECKPOINT_RESULT_VALUES),
  section3: z.enum(CHECKPOINT_RESULT_VALUES),
});
