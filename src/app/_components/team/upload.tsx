"use client";
import { toast } from "sonner";
import { UploadButton } from "../uploadthing";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface UploadProps {
  binnacleLink: string | null;
}

export default function Upload({ binnacleLink }: UploadProps) {
  const [showUpload, setShowUpload] = useState(!binnacleLink);
  const router = useRouter();

  return (
    <div className="mx-20 space-y-4">
      {binnacleLink && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-white">Binnacle</h3>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="self-start rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700 sm:self-auto"
            >
              {showUpload ? "Cancel" : "Replace File"}
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-600">
            <iframe
              src={binnacleLink}
              className="h-64 w-full sm:h-80 md:h-96"
              title="Binnacle Document"
              style={{ border: "none" }}
            />
          </div>

          <div className="flex flex-col gap-2 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
            <span>Document uploaded successfully</span>
            <a
              href={binnacleLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              Open in new tab
            </a>
          </div>
        </div>
      )}

      {(!binnacleLink || showUpload) && (
        <div className="space-y-2">
          {binnacleLink && (
            <p className="text-sm text-yellow-400">
              Uploading a new file will replace the current document
            </p>
          )}
          <UploadButton
            endpoint="binnacleUploader"
            onClientUploadComplete={(res) => {
              toast.success("File uploaded successfully");
              setShowUpload(false);
              // Refresh the page data without full reload
              router.refresh();
            }}
            onUploadError={(error: Error) => {
              toast.error(`Upload failed: ${error.message}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
