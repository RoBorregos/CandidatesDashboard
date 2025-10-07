import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Role } from "@prisma/client";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const teamRouter = createTRPCRouter({
  getTeam: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findFirst({
      where: {
        id: ctx.session.user.id,
      },
    });

    if (!user?.teamId) {
      return null;
    }

    const team = await ctx.db.team.findFirst({
      where: {
        id: user?.teamId,
      },
      include: {
        members: true,
        rounds: {
          select: {
            number: true,
            challenges: true,
          },
        },
        challengeA: true,
        challengeB: true,
        challengeC: true,
      },
    });
    console.log(team);
    return team;
  }),

  saveLink: protectedProcedure
    .input(z.object({ teamId: z.string(), link: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.update({
        where: {
          id: input.teamId,
        },
        data: {
          id: input.teamId,
          link: input.link,
        },
      });

      return team;
    }),

  getTeamIds: protectedProcedure.query(async ({ ctx }) => {
    const team = await ctx.db.team.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return team;
  }),
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        team: true,
      },
    });
  }),

  getAllTeams: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

  getUserRequest: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.teamRequest.findFirst({
      where: {
        userId: ctx.session.user.id,
      },
    });
  }),

  requestTeamAssignment: protectedProcedure
    .input(
      z.object({
        requestedTeam: z.string(),
        message: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { team: true },
      });

      if (user?.team) {
        throw new Error("User already has a team");
      }

      const team = await ctx.db.team.findUnique({
        where: { name: input.requestedTeam },
        include: {
          _count: {
            select: { members: true },
          },
        },
      });
      if (team && team._count.members >= 4) {
        throw new Error("Team is full. Please choose another team.");
      }

      // Verificar si el usuario ya tiene una solicitud
      const existingRequest = await ctx.db.teamRequest.findFirst({
        where: { userId: ctx.session.user.id },
      });

      if (existingRequest) {
        // Actualizar la solicitud existente
        return ctx.db.teamRequest.update({
          where: { id: existingRequest.id },
          data: {
            requestedTeam: input.requestedTeam,
            message: input.message,
            status: "PENDING",
          },
        });
      } else {
        // Crear nueva solicitud
        return ctx.db.teamRequest.create({
          data: {
            userId: ctx.session.user.id,
            requestedTeam: input.requestedTeam,
            message: input.message,
          },
        });
      }
    }),

  // AGREGAR: Nuevos endpoints necesarios
  cancelTeamRequest: protectedProcedure.mutation(async ({ ctx }) => {
    // Primero buscar la solicitud
    const existingRequest = await ctx.db.teamRequest.findFirst({
      where: { userId: ctx.session.user.id },
    });

    if (!existingRequest) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No team request found to cancel.",
      });
    }

    // Eliminar usando el ID
    await ctx.db.teamRequest.delete({
      where: { id: existingRequest.id },
    });

    return { success: true };
  }),

  leaveTeam: protectedProcedure.mutation(async ({ ctx }) => {
    // Buscar y eliminar solicitud de equipo pendiente si existe
    const teamRequest = await ctx.db.teamRequest.findFirst({
      where: { userId: ctx.session.user.id },
    });

    if (teamRequest) {
      await ctx.db.teamRequest.delete({
        where: { id: teamRequest.id },
      });
    }

    // Actualizar usuario para removerlo del equipo
    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: {
        teamId: null,
        role: Role.UNASSIGNED,
      },
    });

    return { success: true };
  }),
});

// type TeamType = ReturnType<typeof teamRouter._def.procedures.getTeam>;

// // export result type o fpromisse
// export typeof { TeamType };
// export
export type TeamType =
  ReturnType<typeof teamRouter._def.procedures.getTeam> extends Promise<infer T>
    ? T
    : never;
