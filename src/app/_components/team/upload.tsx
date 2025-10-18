"use client";
import { toast } from "sonner";
import { UploadButton } from "../uploadthing";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface UploadProps {
  endpoint: "binnacleUploader" | "robotImageUploader" | "imageUploader";
  currentUrl: string | null;
  title?: string;
  isImagePreview?: boolean;
}

export default function Upload({
  endpoint,
  currentUrl,
  title,
  isImagePreview = false,
}: UploadProps) {
  const [showUpload, setShowUpload] = useState(!currentUrl);
  const router = useRouter();

  return (
    <div className="mx-20 space-y-4">
      {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}

      {currentUrl && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-300">
              File uploaded successfully
            </span>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="self-start rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700 sm:self-auto"
            >
              {showUpload ? "Cancel" : "Replace File"}
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-600">
            {isImagePreview ? (
              <img
                src={currentUrl}
                alt="Preview"
                className="h-64 w-full bg-black object-contain sm:h-80 md:h-96"
              />
            ) : (
              <iframe
                src={currentUrl}
                className="h-64 w-full sm:h-80 md:h-96"
                title="Document"
                style={{ border: "none" }}
              />
            )}
          </div>

          <div className="flex flex-col gap-2 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
            <span>Stored URL</span>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              Open in new tab
            </a>
          </div>
        </div>
      )}

      {(!currentUrl || showUpload) && (
        <div className="space-y-2">
          {currentUrl && (
            <p className="text-sm text-yellow-400">
              Uploading a new file will replace the current one.
            </p>
          )}
          <UploadButton
            endpoint={endpoint}
            onClientUploadComplete={() => {
              toast.success("File uploaded successfully");
              setShowUpload(false);
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
