import { z } from "zod";

import { createTRPCRouter, adminProcedure } from "rbrgs/server/api/trpc";

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
    const record: string[] = [];
    const parser = parse({
      delimiter: ",",
    });
    parser.on("readable", function () {
      let record;
      while ((record = parser.read())) {
        console.log(record);
      }
    });
    // R1_PistaA,R1_PistaB,R1_PistaC,R2_PistaA,R2_PistaB,R2_PistaC,R3_PistaA,R3_PistaB,R3_PistaC

    const filePath =
      "/home/oscar/Repositories/CandidatesDashboard/public/schedule.csv";

    fs.createReadStream(filePath).pipe(parser);

    for (const row of record) {
      console.log(row);
    }

    return "Finished";
  }),
});
