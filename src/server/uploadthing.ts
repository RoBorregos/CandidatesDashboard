import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getServerAuthSession } from "./auth";
import { db } from "./db";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getServerAuthSession();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);
      return { uploadedBy: metadata.userId };
    }),

  binnacleUploader: f({
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getServerAuthSession();
      if (!session?.user?.teamId)
        throw new UploadThingError("User isn't in a team");
      return { teamId: session.user.teamId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.team.update({
        where: { id: metadata.teamId },
        data: { binnacleLink: file.ufsUrl },
      });
      return { binnacleLink: file.ufsUrl, teamId: metadata.teamId };
    }),

  robotImageUploader: f({
    "image/jpeg": { maxFileSize: "4MB", maxFileCount: 1 },
    "image/png": { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getServerAuthSession();
      if (!session?.user?.teamId)
        throw new UploadThingError("User isn't in a team");
      return { teamId: session.user.teamId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Extra security check
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        throw new UploadThingError("Only PNG or JPEG images are allowed");
      }
      await db.team.update({
        where: { id: metadata.teamId },
        data: { robotImageLink: file.ufsUrl },
      });
      return { robotImageLink: file.ufsUrl, teamId: metadata.teamId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
