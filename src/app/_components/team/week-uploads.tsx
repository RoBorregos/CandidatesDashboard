"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { UploadDropzone } from "../uploadthing";

const WEEKS = [1, 2, 3, 4, 5, 6] as const;

export default function WeekUploads({ teamName }: { teamName: string }) {
  const [week, setWeek] = useState<(typeof WEEKS)[number]>(1);

  return (
    <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-anton text-xl tracking-wide text-white">
          Entregas por semana
        </h3>
        <span className="text-sm text-neutral-400">{teamName}</span>
      </div>
      <p className="mt-2 text-sm text-neutral-300">
        Sube aquí los archivos de cada semana. Se guardan en una carpeta por
        equipo y semana.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {WEEKS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWeek(w)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              w === week
                ? "bg-roboblue text-white"
                : "border border-neutral-700 text-neutral-300 hover:border-neutral-500"
            }`}
          >
            Semana {w}
          </button>
        ))}
      </div>

      <WeekFiles teamName={teamName} week={week} />
    </div>
  );
}

function WeekFiles({
  teamName,
  week,
}: {
  teamName: string;
  week: number;
}) {
  const utils = api.useUtils();
  const { data: files, isLoading } = api.uploads.getByWeek.useQuery(
    { week },
    {
      // Always fetch fresh on load: the global query client keeps a 30s
      // staleTime, which would let a reload show cached/stale files instead
      // of the current team folder.
      refetchOnMount: "always",
      staleTime: 0,
      // "Webhook-like" realtime sync: every session (any account) re-checks the
      // week's folder periodically, so an upload or delete made elsewhere shows
      // up without the user having to reload. Background mode keeps polling even
      // when the tab loses focus (e.g. while deleting in Prisma Studio).
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    },
  );

  const remove = api.uploads.remove.useMutation({
    onSuccess: async () => {
      await utils.uploads.getByWeek.invalidate({ week });
      toast.success("Archivo eliminado");
    },
    onError: (error) => {
      toast.error(`No se pudo eliminar: ${error.message}`);
    },
  });

  const prepareUpload = api.uploads.prepareUpload.useMutation();

  const [uploading, setUploading] = useState(false);
  const [uploadSucceeded, setUploadSucceeded] = useState(false);

  return (
    <div className="mt-5">
      <p className="text-sm text-neutral-400">
        Carpeta:{" "}
        <code className="text-roboblue">
          {teamName}/week{week}/
        </code>
      </p>

      <div className="mt-3">
        <UploadDropzone
          endpoint="teamUploader"
          input={{ week }}
          className="week-uploads-dropzone"
          appearance={{
            button: ({ files }) => {
              if (uploading) return { backgroundColor: "#22c57e" };
              if (uploadSucceeded || (files ?? []).length > 0)
                return { backgroundColor: "#22c57e" };
              return { backgroundColor: "#3b82f6" };
            },
          }}
          onBeforeUploadBegin={async (selectedFiles) => {
            if (selectedFiles.length > 0) {
              try {
                const result = await prepareUpload.mutateAsync({
                  week,
                  fileNames: selectedFiles.map((file) => file.name),
                });
                if (result.freed > 0 || result.conflicts.length > 0) {
                  toast.info(
                    "Se reemplazará el archivo anterior de la carpeta",
                  );
                }
              } catch {
                // The server-side middleware frees conflicts too, so a failed
                // pre-check doesn't have to block the upload.
              }
            }
            return selectedFiles;
          }}
          onUploadBegin={() => {
            setUploading(true);
            setUploadSucceeded(false);
          }}
          onClientUploadComplete={async () => {
            setUploading(false);
            setUploadSucceeded(true);
            await utils.uploads.getByWeek.invalidate({ week });
            toast.success("Archivo subido correctamente");
          }}
          onUploadError={(error) => {
            setUploading(false);
            setUploadSucceeded(false);
            toast.error(`Error al subir: ${error.message}`);
          }}
          content={{
            button: ({ files, isUploading }) => {
              if (isUploading || uploading) return "Uploading...";
              if (uploadSucceeded || (files ?? []).length > 0) return "Upload file";
              return "Choose file";
            },
            label: `Suelta o selecciona los archivos de la semana ${week}`,
            allowedContent: "Cualquier archivo (máx. 64MB por archivo)",
          }}
        />
      </div>

      {uploadSucceeded && (
        <p className="mt-2 flex items-center gap-1 text-sm font-medium text-green-400">
          <span aria-hidden>Éxito –</span> ¡Archivo(s) subido(s) correctamente!
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {files?.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-green-900/40 bg-black/40 p-3"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                title="Subido"
                className="h-2 w-2 shrink-0 rounded-full bg-green-500"
              />
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={file.name}
                className="truncate text-blue-400 underline-offset-2 hover:underline"
              >
                {file.name}
              </a>
            </span>
            <button
              type="button"
              onClick={() => remove.mutate({ id: file.id })}
              className="shrink-0 rounded-md px-2 py-1 text-sm text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              Eliminar
            </button>
          </li>
        ))}
        {!isLoading && (files?.length ?? 0) === 0 && (
          <li className="rounded-lg border border-dashed border-neutral-800 p-3 text-sm text-neutral-500">
            Todavía no hay archivos en esta semana.
          </li>
        )}
      </ul>
    </div>
  );
}