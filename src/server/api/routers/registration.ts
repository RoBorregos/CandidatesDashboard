import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { RegistrationStatus } from "@prisma/client";

import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { CURRENT_EDITION, registrationSchema } from "~/lib/registration";

export const registrationRouter = createTRPCRouter({
  // Formulario publico: cualquiera puede registrarse sin iniciar sesion.
  create: publicProcedure
    .input(registrationSchema)
    .mutation(async ({ ctx, input }) => {
      const [contact] = input.members;

      if (!contact) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Faltan los datos del primer miembro.",
        });
      }

      const emails = input.members.map((member) => member.email);

      // Ningun correo puede aparecer en dos registros de la misma edicion.
      const taken = await ctx.db.registrationMember.findFirst({
        where: {
          email: { in: emails },
          registration: { edition: CURRENT_EDITION },
        },
        select: { email: true },
      });

      if (taken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `El correo ${taken.email} ya está registrado en esta edición.`,
        });
      }

      const registration = await ctx.db.registration.create({
        data: {
          edition: CURRENT_EDITION,
          track: input.track,
          challenge: input.track === "ADVANCED" ? input.challenge : null,
          hasTeam: input.hasTeam,
          teamName: input.hasTeam ? input.teamName : null,
          wantsExtraMember: input.hasTeam
            ? (input.wantsExtraMember ?? false)
            : null,
          knowsExtraMember: input.hasTeam
            ? (input.knowsExtraMember ?? false)
            : null,
          origin: input.hasTeam ? null : input.origin,
          funFacts: input.hasTeam ? null : input.funFacts,
          contactEmail: contact.email,
          members: {
            create: input.members.map((member, index) => ({
              order: index + 1,
              name: member.name,
              email: member.email,
              phone: member.phone,
              careerAndSemester: member.careerAndSemester,
              role: member.role,
            })),
          },
        },
        select: { id: true, teamName: true, hasTeam: true },
      });

      return registration;
    }),

  getAll: adminProcedure
    .input(
      z
        .object({
          edition: z.number().int().optional(),
          status: z.nativeEnum(RegistrationStatus).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.registration.findMany({
        where: {
          edition: input?.edition ?? CURRENT_EDITION,
          ...(input?.status ? { status: input.status } : {}),
        },
        include: {
          members: { orderBy: { order: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(RegistrationStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.registration.update({
        where: { id: input.id },
        data: { status: input.status },
      });
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.registration.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
