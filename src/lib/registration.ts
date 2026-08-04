import { z } from "zod";

/** Edición a la que pertenecen los registros nuevos. */
export const CURRENT_EDITION = 2026;

export const TRACKS = [
  {
    value: "BEGINNER",
    label: "Candidates Principiantes",
    description:
      "Para quienes van empezando en robótica. No necesitas experiencia previa.",
  },
  {
    value: "ADVANCED",
    label: "Candidates Avanzados",
    description:
      "Para quienes ya tienen experiencia y quieren competir en uno de los retos del @Home Challenge.",
  },
] as const;

/**
 * Retos disponibles para la rama de avanzados.
 * Editar esta lista es suficiente para cambiar las opciones: el reto se guarda
 * como texto en Registration.challenge, así que no hace falta migrar la BD.
 */
export const ADVANCED_CHALLENGES = [
  "@Home Challenge Human Robot Interaction (HRI)",
  "@Home Challenge Visión",
  "@Home Challenge Reto de Mecánica",
  "@Home Challenge Reto de Electrónica",
] as const;

export const MEMBER_ROLES = [
  "PROGRAMMING",
  "MECHANICS",
  "ELECTRONICS",
] as const;

export const ROLE_LABELS: Record<(typeof MEMBER_ROLES)[number], string> = {
  PROGRAMMING: "Programación",
  MECHANICS: "Mecánica",
  ELECTRONICS: "Electrónica",
};

export const ORIGIN_LABELS = {
  LOCAL: "Local",
  FOREIGN: "Foráneo/a",
} as const;

export const STATUS_LABELS = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
} as const;

/** Miembros que un equipo debe registrar antes de poder enviar la solicitud. */
export const MIN_TEAM_MEMBERS = 3;
export const MAX_TEAM_MEMBERS = 4;

/** Semestre maximo seleccionable en el formulario. */
export const MAX_SEMESTER = 8;

export const SEMESTER_OPTIONS = Array.from(
  { length: MAX_SEMESTER },
  (_, index) => index + 1,
);

export const CAREER_SUGGESTIONS = [
  "IRS",
  "ITC",
  "IMT",
] as const;

export const memberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: "Escribe el nombre completo" })
    .max(100, { message: "Máximo 100 caracteres" }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Escribe un correo válido" })
    .max(100, { message: "Máximo 100 caracteres" }),
  phone: z
    .string()
    .trim()
    .min(10, { message: "Escribe tu número a 10 dígitos" })
    .max(20, { message: "Máximo 20 caracteres" }),
  career: z
    .string()
    .trim()
    .min(2, { message: "Escribe tu carrera. Ejemplo: IRS" })
    .max(100, { message: "Máximo 100 caracteres" }),
  semester: z.coerce
    .number({ message: "Selecciona tu semestre" })
    .int()
    .min(1, { message: "Selecciona tu semestre" })
    .max(MAX_SEMESTER, { message: `Máximo ${MAX_SEMESTER}` }),
  role: z.enum(MEMBER_ROLES, { message: "Selecciona un rol" }),
});

export type RegistrationMemberInput = z.infer<typeof memberSchema>;

export const registrationSchema = z
  .object({
    track: z.enum(["BEGINNER", "ADVANCED"], {
      message: "Selecciona una competencia",
    }),
    challenge: z.string().trim().max(120).optional(),
    hasTeam: z.boolean(),
    teamName: z.string().trim().max(60).optional(),
    members: z.array(memberSchema).min(1).max(MAX_TEAM_MEMBERS),
    wantsExtraMember: z.boolean().optional(),
    knowsExtraMember: z.boolean().optional(),
    origin: z.enum(["LOCAL", "FOREIGN"]).optional(),
    funFacts: z.string().trim().max(600).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.track === "ADVANCED" && !data.challenge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["challenge"],
        message: "Selecciona el reto que te interesa",
      });
    }

    if (data.hasTeam) {
      if (!data.teamName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teamName"],
          message: "Escribe el nombre del equipo",
        });
      }

      if (data.members.length < MIN_TEAM_MEMBERS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["members"],
          message: `Registra los datos de ${MIN_TEAM_MEMBERS} miembros`,
        });
      }

      // El cuarto miembro solo se captura si el equipo lo quiere y ya lo conoce.
      if (
        data.members.length > MIN_TEAM_MEMBERS &&
        !(data.wantsExtraMember && data.knowsExtraMember)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["members"],
          message: "Datos del cuarto miembro sin confirmar",
        });
      }
    } else {
      if (data.members.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["members"],
          message: "Solo se registran tus datos",
        });
      }

      if (!data.origin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["origin"],
          message: "Selecciona de dónde eres",
        });
      }

      if (!data.funFacts) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["funFacts"],
          message: "Cuéntanos algunos fun facts sobre ti",
        });
      }
    }

    // Un mismo correo no puede aparecer dos veces en el equipo.
    const seen = new Set<string>();
    data.members.forEach((member, index) => {
      if (seen.has(member.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["members", index, "email"],
          message: "Este correo ya lo usaste en otro miembro",
        });
      }
      seen.add(member.email);
    });
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;
