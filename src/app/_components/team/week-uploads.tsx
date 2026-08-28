"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { useUploadThing } from "../uploadthing";

// MAX_UPLOAD_WEEK is defined on src\server\api\routers\upload.ts
const WEEKS = [1, 2, 3, 4, 5, "FINAL"] as const;
type WeekKey = (typeof WEEKS)[number];

const WEEK_LABELS: Record<WeekKey, string> = {
  1: "Semana 1",
  2: "Semana 2",
  3: "Semana 3",
  4: "Semana 4",
  5: "Semana 5",
  FINAL: "Final",
};

// The server stores weeks as plain integers; "FINAL" is folded into a
// reserved number so the rest of the pipeline stays numeric.
const toWeekNumber = (week: WeekKey): number => (week === "FINAL" ? 7 : week);

export default function WeekUploads({ teamName }: { teamName: string }) {
  const [week, setWeek] = useState<WeekKey>(1);

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
            {WEEK_LABELS[w]}
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
  week: WeekKey;
}) {
  const utils = api.useUtils();
  const weekNumber = toWeekNumber(week);
  const { data: files, isLoading } = api.uploads.getByWeek.useQuery(
    { week: weekNumber },
    {
      // Always fetch fresh on load: the global query client keeps a 30s
      // staleTime, which would let a reload show cached/stale files instead
      // of the current team folder.
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  );

  const remove = api.uploads.remove.useMutation({
    onSuccess: async () => {
      await utils.uploads.getByWeek.invalidate({ week: weekNumber });
      toast.success("Archivo eliminado");
    },
    onError: (error) => {
      toast.error(`No se pudo eliminar: ${error.message}`);
    },
  });

  const prepareUpload = api.uploads.prepareUpload.useMutation();

  const [uploadSucceeded, setUploadSucceeded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("teamUploader", {
    onBeforeUploadBegin: async (selectedFiles) => {
      if (selectedFiles.length > 0) {
        try {
          const result = await prepareUpload.mutateAsync({
            week: weekNumber,
            fileNames: selectedFiles.map((file) => file.name),
          });
          if (result.freed > 0 || result.conflicts.length > 0) {
            toast.info("Se reemplazará el archivo anterior de la carpeta");
          }
        } catch {
          // The server-side middleware frees conflicts too, so a failed
          // pre-check doesn't have to block the upload.
        }
      }
      return selectedFiles;
    },
    onUploadBegin: () => {
      setUploadSucceeded(false);
      setUploadProgress(0);
    },
    onUploadProgress: (progress) => setUploadProgress(progress),
    onClientUploadComplete: async () => {
      setUploadSucceeded(true);
      await utils.uploads.getByWeek.invalidate({ week: weekNumber });
      toast.success("Archivo subido correctamente");
    },
    onUploadError: (error) => {
      setUploadSucceeded(false);
      toast.error(`Error al subir: ${error.message}`);
    },
  });

  const handleFiles = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0 || isUploading) return;
    void startUpload(selectedFiles, { week: weekNumber });
  };

  return (
    <div className="mt-5">
      <p className="text-sm text-neutral-400">
        Carpeta:{" "}
        <code className="text-roboblue">
          {teamName}/week{weekNumber}/
        </code>
      </p>

      <div className="mt-3">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);
            handleFiles(Array.from(event.dataTransfer.files));
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragActive
              ? "border-roboblue bg-roboblue/10"
              : "border-neutral-700 bg-black/40 hover:border-neutral-500"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              handleFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <p className="text-sm font-medium text-neutral-200">
            {isUploading
              ? "Subiendo…"
              : `Suelta o selecciona los archivos de ${WEEK_LABELS[week]}`}
          </p>
          <p className="text-xs text-neutral-500">
            Cualquier archivo (máx. 64MB por archivo)
          </p>
        </div>

        {isUploading && (
          <div className="mt-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-green-500 transition-[width] duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Subiendo… {uploadProgress}%
            </p>
          </div>
        )}
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