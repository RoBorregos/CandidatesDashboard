// TODO: Remove this example page once the upload functionality is used in the right place

"use client";

import { Role } from "@prisma/client";
import { useSession } from "next-auth/react";
import { UploadButton } from "rbrgs/app/_components/uploadthing";
import { useState } from "react";

export default function Home() {
  const session = useSession();
  const [url, setUrl] = useState<string | null>(null);

  if (session.data?.user.role !== Role.ADMIN)
    return (
      <div className="mt-32 text-center text-white">
        This test page is for admins only
      </div>
    );

  return (
    <main className="flex flex-col items-center justify-between p-24 text-white">
      {url}
      <UploadButton
        endpoint="pdfUploader"
        onClientUploadComplete={(res) => {
          // Do something with the response
          console.log("Files: ", res);
          setUrl(res[0]?.ufsUrl || null);
        }}
        onUploadError={(error: Error) => {
          // Do something with the error.
          alert(`ERROR! ${error.message}`);
        }}
      />
    </main>
  );
}
