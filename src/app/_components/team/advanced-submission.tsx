"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { useUploadThing } from "../uploadthing";
import { DeadlineLateTag } from "../late-tag";
import { DEADLINE_TIME_ZONE } from "~/lib/weeks";

type FileKind = "bitacora" | "video";

const SLOTS: Record<
  FileKind,
  {
    label: string;
    hint: string;
    accept?: string;
    route: "advancedBitacora" | "advancedVideo";
  }
> = {
  bitacora: {
    label: "Bitácora",
    hint: "PDF u otro documento · hasta 32 MB",
    route: "advancedBitacora",
  },
  video: {
    label: "Video de la demo",
    hint: "Archivo de video · hasta 256 MB",
    accept: "video/*",
    route: "advancedVideo",
  },
};

// "vie 9 oct 2026, 11:59 p. m." in the event's time zone.
function formatDueAt(date: Date): string {
  return date.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DEADLINE_TIME_ZONE,
  });
}

function formatBytes(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/*
 * Advanced candidates compete alone and have no team, so they hand in their
 * bitácora, GitHub link and demo video here instead of the weekly uploads.
 * Their challenge mentors see all three on the mentor dashboard.
 */
export default function AdvancedSubmission() {
  const { data, isLoading } = api.advancedSubmission.getMine.useQuery();
  const submission = data?.submission;
  const dueAt = data?.dueAt;
  const closed = dueAt != null && Date.now() > dueAt.getTime();
  const utils = api.useUtils();

  const [github, setGithub] = useState("");
  useEffect(() => {
    setGithub(submission?.githubUrl ?? "");
  }, [submission?.githubUrl]);

  const saveGithub = api.advancedSubmission.saveGithub.useMutation({
    onSuccess: async () => {
      await utils.advancedSubmission.getMine.invalidate();
      toast.success("Enlace guardado");
    },
    onError: (error) => {
      const fieldError = error.data?.zodError?.fieldErrors?.url?.[0];
      toast.error(fieldError ?? error.message);
    },
  });

  const githubDirty = github.trim() !== (submission?.githubUrl ?? "");

  return (
    <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-6 font-archivo lg:p-8">
      <h3 className="font-anton text-xl tracking-wide text-white">
        Tu entrega
      </h3>
      <p className="mt-2 text-sm text-neutral-300">
        Sube tu bitácora, el enlace a tu repositorio y el video de tu demo. Tus
        mentores del reto las verán en cuanto las subas; puedes reemplazarlas
        hasta la fecha límite.
      </p>
      {dueAt && (
        <p
          className={`mt-2 text-sm ${closed ? "font-medium text-amber-400" : "text-neutral-400"}`}
        >
          {closed ? "La entrega cerró el " : "Límite de entrega: "}
          {formatDueAt(dueAt)}
        </p>
      )}

      <div className="mt-5 space-y-4">
        <FileSlot
          kind="bitacora"
          file={
            submission?.bitacoraUrl
              ? {
                  name: submission.bitacoraName ?? "Bitácora",
                  url: submission.bitacoraUrl,
                  size: submission.bitacoraSize,
                  uploadedAt: submission.bitacoraUploadedAt,
                }
              : null
          }
          dueAt={dueAt}
          closed={closed}
          loading={isLoading}
        />

        <div className="rounded-lg border border-neutral-800 bg-black/30 p-4">
          <label
            htmlFor="advanced-github"
            className="text-sm font-medium text-neutral-200"
          >
            Repositorio de GitHub
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="advanced-github"
              type="url"
              value={github}
              onChange={(event) => setGithub(event.target.value)}
              readOnly={closed}
              placeholder="https://github.com/usuario/repositorio"
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-black/40 p-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-roboblue focus:outline-none"
            />
            <button
              type="button"
              onClick={() => saveGithub.mutate({ url: github.trim() })}
              disabled={closed || !githubDirty || saveGithub.isPending}
              className="shrink-0 rounded-lg bg-roboblue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-roboblue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveGithub.isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {submission?.githubUrl && (
            <span className="mt-2 flex min-w-0 items-center gap-2">
              <a
                href={submission.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-blue-400 underline-offset-2 hover:underline"
              >
                {submission.githubUrl}
              </a>
              {dueAt && (
                <DeadlineLateTag
                  dueAt={dueAt}
                  uploadedAt={submission.githubUpdatedAt}
                />
              )}
            </span>
          )}
        </div>

        <FileSlot
          kind="video"
          file={
            submission?.videoUrl
              ? {
                  name: submission.videoName ?? "Video",
                  url: submission.videoUrl,
                  size: submission.videoSize,
                  uploadedAt: submission.videoUploadedAt,
                }
              : null
          }
          dueAt={dueAt}
          closed={closed}
          loading={isLoading}
        />
      </div>
    </div>
  );
}

function FileSlot({
  kind,
  file,
  dueAt,
  closed,
  loading,
}: {
  kind: FileKind;
  file: {
    name: string;
    url: string;
    size: number | null;
    uploadedAt: Date | null;
  } | null;
  dueAt: Date | undefined;
  closed: boolean;
  loading: boolean;
}) {
  const slot = SLOTS[kind];
  const utils = api.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);

  const { startUpload, isUploading } = useUploadThing(slot.route, {
    onUploadProgress: (value) => setProgress((prev) => Math.max(prev, value)),
    onClientUploadComplete: async () => {
      await utils.advancedSubmission.getMine.invalidate();
      toast.success(`${slot.label}: archivo subido correctamente`);
    },
    onUploadError: (error) => {
      toast.error(`No se pudo subir: ${error.message}`);
    },
  });

  const remove = api.advancedSubmission.removeFile.useMutation({
    onSuccess: async () => {
      await utils.advancedSubmission.getMine.invalidate();
      toast.success("Archivo eliminado");
    },
    onError: (error) => toast.error(error.message),
  });

  const upload = (selected: File | undefined) => {
    if (!selected || isUploading) return;
    setProgress(0);
    void startUpload([selected]);
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-black/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-neutral-200">{slot.label}</p>
        <p className="text-xs text-neutral-500">{slot.hint}</p>
      </div>

      {file ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-green-900/40 bg-black/40 p-3">
          <span className="flex min-w-0 items-center gap-2">
            <span
              title="Subido"
              className="h-2 w-2 shrink-0 rounded-full bg-green-500"
            />
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              title={file.name}
              className="truncate text-sm text-blue-400 underline-offset-2 hover:underline"
            >
              {file.name}
            </a>
            {dueAt && (
              <DeadlineLateTag dueAt={dueAt} uploadedAt={file.uploadedAt} />
            )}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="text-xs tabular-nums text-neutral-500">
              {formatBytes(file.size)}
            </span>
            <button
              type="button"
              disabled={closed || remove.isPending || isUploading}
              onClick={() => remove.mutate({ kind })}
              className="rounded-md px-2 py-1 text-sm text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Eliminar
            </button>
          </span>
        </div>
      ) : (
        !loading && (
          <p className="mt-3 text-sm text-neutral-500">
            {closed
              ? "No se entregó."
              : `Todavía no has subido tu ${slot.label.toLowerCase()}.`}
          </p>
        )
      )}

      {!closed && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={slot.accept}
            className="hidden"
            onChange={(event) => {
              upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="mt-3 rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading
              ? `Subiendo… ${progress}%`
              : file
                ? "Reemplazar archivo"
                : "Subir archivo"}
          </button>
        </>
      )}
    </div>
  );
}
