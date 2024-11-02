/* eslint-disable */

import { adminProcedure, createTRPCRouter } from "rbrgs/server/api/trpc";
import { parse } from "csv-parse";
import fs from "fs";

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
