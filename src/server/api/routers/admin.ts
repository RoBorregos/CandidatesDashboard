import { z } from "zod";

import { createTRPCRouter, adminProcedure } from "rbrgs/server/api/trpc";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse";
import fs from "fs";

const computePointsLOP = (lackOfProgress: number) => {
  if (lackOfProgress == 0) {
    return 20;
  } else if (lackOfProgress == 1) {
    return 10;
  } else if (lackOfProgress == 2) {
    return 5;
  }
  return 0;
};

export const adminRouter = createTRPCRouter({
  uploadTeamData: adminProcedure.mutation(async ({ ctx }) => {
    const records: string[][] = [];
    const parser = parse({
      delimiter: ",",
    });
    parser.on("readable", function () {
      let record;
      while ((record = parser.read())) {
        console.log(record);
        records.push(record);
      }
    });
    // R1_PistaA,R1_PistaB,R1_PistaC,R2_PistaA,R2_PistaB,R2_PistaC,R3_PistaA,R3_PistaB,R3_PistaC

    const filePath =
      "/home/oscar/Repositories/CandidatesDashboard/public/test.csv";

    fs.createReadStream(filePath).pipe(parser);

    parser.on("end", async function () {
      // console.log(records);

      for await (const row of records) {
        // Create 3 rounds

        console.log("asdasd");

        const teamObject = await ctx.db.team.findFirst({
          where: {
            name: row[0]?.trim() ?? "",
          },
        });

        const vals = await ctx.db.round.deleteMany({
          where: {
            teamId: teamObject?.id,
          },
        });

        console.log("Del:", vals);

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
  return new Date();
};
