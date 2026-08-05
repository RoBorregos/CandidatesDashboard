import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma, RegistrationStatus, Role } from "@prisma/client";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { CURRENT_EDITION, registrationSchema } from "~/lib/registration";

export const registrationRouter = createTRPCRouter({
  // Public form: anyone can register without signing in.
  create: publicProcedure
    .input(registrationSchema)
    .mutation(async ({ ctx, input }) => {
      const emails = input.members.map((member) => member.email);

      // No email may appear in two registrations of the same edition.
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

      try {
        return await ctx.db.registration.create({
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
            members: {
              create: input.members.map((member, index) => ({
                order: index + 1,
                name: member.name,
                email: member.email,
                phone: member.phone,
                career: member.career,
                semester: member.semester,
                interviewArea: member.interviewArea ?? null,
                edition: CURRENT_EDITION,
              })),
            },
          },
          select: { id: true, teamName: true, hasTeam: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Alguno de los correos ya está registrado en esta edición. Revísalos e intenta de nuevo.",
          });
        }
        throw error;
      }
    }),

  getMine: protectedProcedure.query(async ({ ctx }) => {
    const email = ctx.session.user.email;
    if (!email) return null;

    return ctx.db.registration.findFirst({
      where: {
        edition: CURRENT_EDITION,
        members: { some: { email: { equals: email, mode: "insensitive" } } },
      },
      include: { members: { orderBy: { order: "asc" } } },
    });
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

  accept: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.registration.findUnique({
        where: { id: input.id },
        include: { members: true },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No encontramos ese registro.",
        });
      }

      if (!registration.hasTeam || !registration.teamName) {
        await ctx.db.registration.update({
          where: { id: registration.id },
          data: { status: RegistrationStatus.ACCEPTED },
        });
        return { teamCreated: false, teamName: null };
      }

      const teamName = registration.teamName;
      const existingTeam = await ctx.db.team.findUnique({
        where: { name: teamName },
      });

      if (existingTeam && existingTeam.id !== registration.teamId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Ya existe un equipo llamado "${teamName}" que viene de otro registro. Cambia el nombre de uno de los dos antes de aceptar.`,
        });
      }

      const emails = registration.members.map((member) => member.email);

      return ctx.db.$transaction(async (tx) => {
        const team =
          existingTeam ?? (await tx.team.create({ data: { name: teamName } }));


        await tx.user.updateMany({
          where: { email: { in: emails }, teamId: null },
          data: { teamId: team.id },
        });
        await tx.user.updateMany({
          where: { email: { in: emails }, role: Role.UNASSIGNED },
          data: { role: Role.CONTESTANT },
        });

        for (const member of registration.members) {
          if (!member.interviewArea) continue;
          await tx.user.updateMany({
            where: { email: member.email, interviewArea: null },
            data: { interviewArea: member.interviewArea },
          });
        }

        await tx.registration.update({
          where: { id: registration.id },
          data: { status: RegistrationStatus.ACCEPTED, teamId: team.id },
        });

        return { teamCreated: !existingTeam, teamName: team.name };
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
