/* eslint-disable */

import { adminProcedure, createTRPCRouter } from "rbrgs/server/api/trpc";
import { parse } from "csv-parse";
import { z } from "zod";
import fs from "fs";
import { Role } from "@prisma/client";

export const adminRouter = createTRPCRouter({
  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      include: {
        team: true,
      },
      orderBy: {
        email: "asc",
      },
    });
  }),

  getAllTeams: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      include: {
        members: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),

  getPendingRequests: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.teamRequest.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  assignUserToTeam: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        teamName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { name: input.teamName },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          teamId: team.id,
          role: Role.CONTESTANT,
        },
      });

      return { success: true };
    }),

  createTeam: adminProcedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.create({
        data: {
          name: input.name,
        },
      });
    }),

  approveTeamRequest: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.teamRequest.findUnique({
        where: { id: input.requestId },
        include: { user: true },
      });

      if (!request) {
        throw new Error("Request not found");
      }

      const team = await ctx.db.team.findUnique({
        where: { name: request.requestedTeam },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      await ctx.db.user.update({
        where: { id: request.userId },
        data: {
          teamId: team.id,
          role: Role.CONTESTANT,
        },
      });

      await ctx.db.teamRequest.update({
        where: { id: input.requestId },
        data: { status: "APPROVED" },
      });

      return { success: true };
    }),

  rejectTeamRequest: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.teamRequest.update({
        where: { id: input.requestId },
        data: { status: "REJECTED" },
      });

      return { success: true };
    }),

  removeUserFromTeam: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          teamId: null,
          role: Role.UNASSIGNED,
        },
      });

      return { success: true };
    }),

  uploadTeamData: adminProcedure.mutation(async ({ ctx }) => {
    const records: string[][] = [];
    const parser = parse({
      delimiter: ",",
    });
    parser.on("readable", function () {
      let record;
      while ((record = parser.read())) {
        console.log(record);
        if (record[0] === "Nombre") {
          continue;
        }
        records.push(record);
      }
    });
    // R1_PistaA,R1_PistaB,R1_PistaC,R2_PistaA,R2_PistaB,R2_PistaC,R3_PistaA,R3_PistaB,R3_PistaC
    const filePath = "public/schedule.csv";

    fs.createReadStream(filePath).pipe(parser);

    parser.on("end", async function () {
      for await (const row of records) {
        // Create 3 rounds

        const teamObject = await ctx.db.team.findFirst({
          where: {
            name: row[0]?.trim() ?? "",
          },
        });

        await ctx.db.round.deleteMany({
          where: {
            teamId: teamObject?.id,
          },
        });

        await ctx.db.round.create({
          data: {
            teamId: teamObject?.id,
            number: 1,
            challenges: {
              create: [
                { name: "Pista A", time: ComputeDate({ date: row[1] }) },
                { name: "Pista B", time: ComputeDate({ date: row[2] }) },
                { name: "Pista C", time: ComputeDate({ date: row[3] }) },
              ],
            },
          },
        });

        await ctx.db.round.create({
          data: {
            teamId: teamObject?.id,
            number: 2,
            challenges: {
              create: [
                { name: "Pista A", time: ComputeDate({ date: row[4] }) },
                { name: "Pista B", time: ComputeDate({ date: row[5] }) },
                { name: "Pista C", time: ComputeDate({ date: row[6] }) },
              ],
            },
          },
        });
        await ctx.db.round.create({
          data: {
            teamId: teamObject?.id,
            number: 3,
            challenges: {
              create: [
                { name: "Pista A", time: ComputeDate({ date: row[7] }) },
                { name: "Pista B", time: ComputeDate({ date: row[8] }) },
                { name: "Pista C", time: ComputeDate({ date: row[9] }) },
              ],
            },
          },
        });
      }
    });

    return "Finished";
  }),
});

const ComputeDate = ({ date }: { date: string | undefined }) => {
  if (date === undefined) {
    const inv = new Date();
    inv.setHours(0);
    inv.setMinutes(0);
    return inv;
  }

  const timeParts = date.split(":");
  var hour = parseInt(timeParts[0] ?? "0");
  const minute = timeParts[1];

  if (hour < 8) {
    hour += 12;
  }

  var d = new Date();
  d.setHours(hour);
  d.setMinutes(parseInt(minute ?? "0"));
  return d;
};
