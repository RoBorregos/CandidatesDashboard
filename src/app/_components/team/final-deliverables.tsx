"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { useUploadThing } from "../uploadthing";
import LateTag from "../late-tag";
import FinalDeliverableIcon from "../final-deliverable-icon";
import {
  DEADLINE_TIME_ZONE,
  FINAL_WEEK,
  weekAssignedAt,
  weekDueAt,
} from "~/lib/weeks";
import {
  FINAL_DELIVERABLES,
  FINAL_REPOSITORY_FILE,
  finalDisplayName,
  finalSlotOf,
  LEGACY_FINAL_MANIFEST_FILE,
  type FinalDeliverable,
  type FinalFileDeliverableKey,
} from "~/lib/final-deliverables";

// Mirrors the limits in ~/server/api/routers/upload (server-only module).
const COMMENTS_FILE = "COMMENTS.md";
const INTERNAL_FILES = [
  COMMENTS_FILE,
  FINAL_REPOSITORY_FILE,
  LEGACY_FINAL_MANIFEST_FILE,
];
const MAX_COMMENT_CHARS = 2045;
const MAX_COMMENT_BYTES = 2048;
const MAX_WEEK_BYTES = 256 * 1024 * 1024;

type UploadedFile = {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatScheduleDate(date: Date, withTime: boolean): string {
  return date.toLocaleString("es-MX", {
    ...(withTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" }),
    timeZone: DEADLINE_TIME_ZONE,
  });
}

/**
 * The FINAL submission: the four hardcoded deliverables (CAD, schematic,
 * repository link, unified logbook) in a 2x2 grid, plus the team's shared
 * comments. Each file is stored under its slot's subfolder, `FINAL/{team}/{slot}/`.
 */
export default function FinalDeliverables({ teamName }: { teamName: string }) {
  const utils = api.useUtils();

  const { data: files, isLoading } = api.uploads.getByWeek.useQuery(
    { week: FINAL_WEEK },
    { refetchOnWindowFocus: false, refetchOnMount: true },
  );
  const { data: deliverables } = api.uploads.getFinalDeliverables.useQuery(
    undefined,
    { refetchOnWindowFocus: false, refetchOnMount: true },
  );

  const refresh = async () => {
    await Promise.all([
      utils.uploads.getByWeek.invalidate({ week: FINAL_WEEK }),
      utils.uploads.getFinalDeliverables.invalidate(),
    ]);
  };

  const remove = api.uploads.remove.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Archivo eliminado");
    },
    onError: (error) => toast.error(`No se pudo eliminar: ${error.message}`),
  });

  const [uploadingKey, setUploadingKey] = useState<FinalFileDeliverableKey | null>(null);
  const [progress, setProgress] = useState(0);
  const errorCodeRef = useRef("");

  const { startUpload } = useUploadThing("teamUploader", {
    onUploadProgress: (value) => setProgress((prev) => Math.max(prev, value)),
    onUploadError: (error) => {
      errorCodeRef.current = error.code;
    },
  });

  const visibleFiles: UploadedFile[] = (files ?? []).filter(
    (file) => !INTERNAL_FILES.includes(file.name),
  );
  const usedBytes = visibleFiles.reduce((sum, f) => sum + (f.fileSize ?? 0), 0);

  // Which stored file fills each slot: the one in its `{slot}/` folder.
  const fileFor = (key: FinalFileDeliverableKey) =>
    visibleFiles.find((file) => finalSlotOf(file.name) === key);

  const uploadDeliverable = async (key: FinalFileDeliverableKey, file: File) => {
    if (uploadingKey) return;
    const upper = file.name.toUpperCase();
    if (INTERNAL_FILES.some((name) => name.toUpperCase() === upper)) {
      toast.error(`No se permite subir ${file.name}`);
      return;
    }
    if (usedBytes + file.size > MAX_WEEK_BYTES) {
      toast.error("La entrega final alcanzaría el límite de 256 MB");
      return;
    }

    setUploadingKey(key);
    setProgress(0);
    errorCodeRef.current = "";
    try {
      // No prepareUpload here: it frees same-named objects across the whole
      // FINAL folder, which would delete another slot's file. Each slot has
      // its own subfolder, and assignFinalDeliverable replaces the slot's
      // previous file once this one lands.
      const res = await startUpload([file], {
        week: FINAL_WEEK,
        deliverable: key,
      });
      if (!res || res.length === 0) {
        toast.error(
          `No se pudo subir ${file.name}. Código de error: ${errorCodeRef.current || "UNKNOWN"}`,
        );
      } else {
        toast.success("Entrega subida correctamente");
      }
    } finally {
      setUploadingKey(null);
      await refresh();
    }
  };

  const assignedAt = weekAssignedAt(FINAL_WEEK);
  const dueAt = weekDueAt(FINAL_WEEK);
  const deadlinePassed = dueAt != null && Date.now() > dueAt.getTime();

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">
          Carpeta: <code className="text-roboblue">{`FINAL/${teamName}/`}</code>
        </p>
        <p className="shrink-0 text-right text-xs text-neutral-400">
          {formatBytes(usedBytes) || "0 B"} de 256 MB
        </p>
      </div>

      {(assignedAt ?? dueAt) && (
        <p className="mt-1 text-xs text-neutral-500">
          {assignedAt && <>Asignada el {formatScheduleDate(assignedAt, false)} · </>}
          {dueAt && (
            <>
              Límite de entrega:{" "}
              <span
                className={
                  deadlinePassed ? "font-medium text-amber-400" : "text-neutral-400"
                }
              >
                {formatScheduleDate(dueAt, true)}
              </span>
            </>
          )}
        </p>
      )}

      <p className="mt-3 text-sm text-neutral-300">
        La entrega final es compartida con todo tu equipo y consta de estas
        cuatro partes. Subir un archivo nuevo en una casilla reemplaza el
        anterior.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FINAL_DELIVERABLES.map((deliverable) =>
          deliverable.kind === "link" ? (
            <RepositoryCard
              key={deliverable.key}
              deliverable={deliverable}
              saved={deliverables?.repository ?? null}
              onSaved={refresh}
            />
          ) : (
            <FileCard
              key={deliverable.key}
              deliverable={deliverable}
              file={fileFor(deliverable.key)}
              isLoading={isLoading}
              uploading={uploadingKey === deliverable.key}
              locked={uploadingKey != null}
              progress={progress}
              onPick={(file) => void uploadDeliverable(deliverable.key, file)}
              onRemove={(id) => remove.mutate({ id })}
            />
          ),
        )}
      </div>

      <FinalComment />
    </div>
  );
}

function CardShell({
  deliverable,
  done,
  children,
}: {
  deliverable: FinalDeliverable;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-4 ${
        done ? "border-green-900/60 bg-green-950/10" : "border-neutral-700 bg-black/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 rounded-lg p-2 ${
            done ? "bg-green-500/10 text-green-400" : "bg-roboblue/10 text-roboblue"
          }`}
        >
          <FinalDeliverableIcon deliverable={deliverable.key} />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-white">
            {deliverable.label}
            {done && (
              <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-green-400">
                Entregado
              </span>
            )}
          </p>
          <p className="text-xs text-neutral-400">{deliverable.description}</p>
          <p className="text-[11px] text-neutral-500">{deliverable.formats}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FileCard({
  deliverable,
  file,
  isLoading,
  uploading,
  locked,
  progress,
  onPick,
  onRemove,
}: {
  deliverable: Extract<FinalDeliverable, { kind: "file" }>;
  file: UploadedFile | undefined;
  isLoading: boolean;
  uploading: boolean;
  locked: boolean;
  progress: number;
  onPick: (file: File) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const pick = (list: FileList | null | undefined) => {
    const picked = list?.[0];
    if (picked && !locked) onPick(picked);
  };

  return (
    <CardShell deliverable={deliverable} done={file != null}>
      {file && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-black/40 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <a
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={finalDisplayName(file.name)}
              className="truncate text-sm text-blue-400 underline-offset-2 hover:underline"
            >
              {finalDisplayName(file.name)}
            </a>
            <LateTag week={FINAL_WEEK} uploadedAt={file.updatedAt ?? file.createdAt} />
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-xs tabular-nums text-neutral-500">
              {formatBytes(file.fileSize)}
            </span>
            <button
              type="button"
              disabled={locked}
              onClick={() => onRemove(file.id)}
              className="rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed"
            >
              Eliminar
            </button>
          </span>
        </div>
      )}

      <div
        role="button"
        tabIndex={locked ? -1 : 0}
        aria-disabled={locked}
        onClick={() => !locked && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!locked && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          pick(event.dataTransfer.files);
        }}
        className={`relative mt-auto flex flex-col items-center justify-center overflow-hidden rounded-md border-2 border-dashed px-3 py-4 text-center text-xs transition-colors ${
          locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${
          dragActive
            ? "border-roboblue bg-roboblue/10"
            : "border-neutral-700 hover:border-neutral-500"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={deliverable.accept}
          className="hidden"
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = "";
          }}
        />
        {uploading ? (
          <>
            <span className="font-medium text-white">Subiendo… {progress}%</span>
            <span className="mt-2 h-1 w-4/5 overflow-hidden rounded-full bg-neutral-700">
              <span
                className="block h-full rounded-full bg-green-500 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </span>
          </>
        ) : (
          <span className="text-neutral-300">
            {isLoading
              ? "Cargando…"
              : file
                ? "Reemplazar archivo"
                : `Arrastra o selecciona el ${deliverable.label.toLowerCase()}`}
          </span>
        )}
      </div>
    </CardShell>
  );
}

function RepositoryCard({
  deliverable,
  saved,
  onSaved,
}: {
  deliverable: Extract<FinalDeliverable, { kind: "link" }>;
  saved: string | null;
  onSaved: () => Promise<void>;
}) {
  const [url, setUrl] = useState(saved ?? "");
  // Pull in the stored link once it loads (or after a teammate changes it),
  // without clobbering what the user is typing.
  const [lastSaved, setLastSaved] = useState(saved);
  useEffect(() => {
    if (saved !== lastSaved) {
      setLastSaved(saved);
      setUrl(saved ?? "");
    }
  }, [saved, lastSaved]);

  const save = api.uploads.saveFinalRepository.useMutation({
    onSuccess: async (result) => {
      setLastSaved(result.repository);
      setUrl(result.repository ?? "");
      await onSaved();
      toast.success(result.repository ? "Repositorio guardado" : "Repositorio eliminado");
    },
    onError: (error) =>
      toast.error(error.data?.zodError ? "Escribe un enlace válido (https://…)" : error.message),
  });

  const trimmed = url.trim();
  const dirty = trimmed !== (saved ?? "");

  return (
    <CardShell deliverable={deliverable} done={saved != null}>
      {saved && (
        <a
          href={saved}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate rounded-md bg-black/40 px-3 py-2 text-sm text-blue-400 underline-offset-2 hover:underline"
        >
          {saved}
        </a>
      )}
      <form
        className="mt-auto flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!dirty || save.isPending) return;
          save.mutate({ url: trimmed || null });
        }}
      >
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://github.com/equipo/robot"
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-black/40 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-roboblue focus:outline-none"
        />
        <button
          type="submit"
          disabled={!dirty || save.isPending}
          className="shrink-0 rounded-md bg-roboblue px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-roboblue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {save.isPending ? "Guardando…" : trimmed || !saved ? "Guardar" : "Quitar"}
        </button>
      </form>
    </CardShell>
  );
}

function FinalComment() {
  const utils = api.useUtils();
  const [comment, setComment] = useState("");
  const submit = api.uploads.submitComment.useMutation({
    onSuccess: async () => {
      setComment("");
      await utils.uploads.getByWeek.invalidate({ week: FINAL_WEEK });
      toast.success("Comentario guardado");
    },
    onError: (error) => toast.error(error.message),
  });

  const text = comment.trim();
  const tooLong =
    comment.length > MAX_COMMENT_CHARS ||
    new TextEncoder().encode(comment).byteLength > MAX_COMMENT_BYTES;
  const remaining = MAX_COMMENT_CHARS - comment.length;

  return (
    <div className="mt-4 rounded-lg border border-neutral-800 bg-black/30 p-4">
      <label htmlFor="comment-final" className="text-sm font-medium text-neutral-200">
        Comentario / Observaciones
      </label>
      <div className="relative mt-2">
        <textarea
          id="comment-final"
          rows={4}
          value={comment}
          readOnly={submit.isPending}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Escribe aquí tu comentario. Se guardará en COMMENTS.md dentro de la carpeta FINAL."
          className="h-32 w-full resize-none overflow-y-auto rounded-lg border border-neutral-700 bg-black/40 p-3 pr-10 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-roboblue focus:outline-none"
        />
        {comment.length > 0 && remaining <= 200 && (
          <div
            className={`pointer-events-none absolute bottom-2 right-3 font-mono text-xs tabular-nums ${
              remaining < 0 ? "text-red-400" : "text-neutral-400"
            }`}
          >
            {remaining}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-neutral-500">
          Nota: los comentarios de la entrega final son compartidos con tu equipo.
        </p>
        <button
          type="button"
          onClick={() => submit.mutate({ week: FINAL_WEEK, text })}
          disabled={!text || tooLong || submit.isPending}
          className="shrink-0 rounded-lg bg-roboblue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-roboblue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submit.isPending ? "Subiendo…" : "Subir comentarios"}
        </button>
      </div>
    </div>
  );
}
