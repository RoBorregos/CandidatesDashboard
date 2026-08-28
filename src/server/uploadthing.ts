import { z } from "zod";
import {
  createUploadthing,
  UTFiles,
  type FileRouter,
} from "uploadthing/next";
import { getServerAuthSession } from "./auth";
import { db } from "./db";
import {
  recordTeamUpload,
  stripFolderPrefix,
  teamUploadFolderPath,
  uploadWeekSchema,
} from "~/server/api/routers/upload";

const f = createUploadthing();

export const ourFileRouter = {
  teamUploader: f({
    blob: { maxFileSize: "64MB", maxFileCount: 10 },
  })
    .input(z.object({ week: uploadWeekSchema }))
    .middleware(async ({ files, input }) => {
      const session = await getServerAuthSession();
      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { teamId: true },
      });
      if (!user?.teamId) {
        throw new Error("User isn't in a team");
      }

      const team = await db.team.findUnique({
        where: { id: user.teamId },
        select: { name: true },
      });
      if (!team) {
        throw new Error("Team not found");
      }

      // Rename each object to {teamName}/week{n}/{fileName} so UploadThing
      // shows the file inside its team/week folder. We deliberately do NOT set
      // a customId: a repeated customId is what makes UploadThing reject the
      // upload with a "file already exists" 409.
      return {
        teamId: user.teamId,
        teamName: team.name,
        week: input.week,
        [UTFiles]: files.map((file) => ({
          ...file,
          name: teamUploadFolderPath(team.name, input.week, file.name),
        })),
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // The object name carries the folder prefix; store the plain file name.
      const name = stripFolderPrefix(metadata.teamName, metadata.week, file.name);
      const record = await recordTeamUpload({
        teamId: metadata.teamId,
        week: metadata.week,
        name,
        fileKey: file.key,
        customId: teamUploadFolderPath(metadata.teamName, metadata.week, name),
        fileUrl: file.ufsUrl,
        fileSize: file.size,
        fileType: file.type,
      });
      return {
        id: record.id,
        name: record.name,
        fileUrl: record.fileUrl,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
