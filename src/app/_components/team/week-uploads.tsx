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

// Comments for a week are accumulated into a single COMMENTS.md. A single
// comment is capped at MAX_COMMENT_CHARS characters and MAX_COMMENT_BYTES
// bytes, and is terminated by \x04 so messages can be fragmented when read.
const COMMENTS_FILE = "COMMENTS.md";
const MAX_COMMENT_CHARS = 2045;
const MAX_COMMENT_BYTES = 2048;
// A week's folder may hold up to 256 MB across all files.
const MAX_WEEK_BYTES = 256 * 1024 * 1024;
// Show the bottom-right counter once the comment is within this many
// characters of the limit.
const COUNTER_THRESHOLD = 200;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "? B";
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

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

  // Same endpoint, but used to quietly cancel orphaned uploads (files the
  // client failed to acknowledge but that reached the server), without the
  // "Archivo eliminado" toast. The failure popup reports them instead.
  const cancelUpload = api.uploads.remove.useMutation();

  const prepareUpload = api.uploads.prepareUpload.useMutation();

  // True while a comment is being sent together with file uploads, so the
  // comment's "Comentario guardado" toast is suppressed in favor of the file
  // upload toast / failure popup.
  const commentFilesRef = useRef(false);

  const submitComment = api.uploads.submitComment.useMutation({
    onSuccess: async () => {
      await utils.uploads.getByWeek.invalidate({ week: weekNumber });
      // When the comment was sent together with file uploads, the file toast /
      // popup already reports the outcome, so skip the separate comment toast.
      if (!commentFilesRef.current) toast.success("Comentario guardado");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [uploadSucceeded, setUploadSucceeded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadFailures, setUploadFailures] = useState<
    { name: string; errCode: string; canceled: boolean }[]
  >([]);
  const [showFailures, setShowFailures] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Holds the most recent UploadThing error code, read when a file upload
  // settles so we can attribute it to the file that just failed.
  const errorCodeRef = useRef("");

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
      // Do NOT reset progress here: onUploadBegin fires once per file, so
      // resetting would make the bar return to zero between files. Progress is
      // (re)set to zero once at the start of the whole upload instead.
      setUploadSucceeded(false);
    },
    onUploadProgress: (progress) =>
      // Never go backwards: UploadThing reports the average across all files,
      // which dips toward zero as large files join, making the bar "bug out".
      setUploadProgress((prev) => Math.max(prev, progress)),
    onClientUploadComplete: () => {
      // Per-file success is handled in handleUpload via startUpload's result;
      // this only lets the overlay clear. The overall flow waits for every
      // file to settle before showing results.
    },
    onUploadError: (error) => {
      setUploadSucceeded(false);
      errorCodeRef.current = error.code;
    },
  });

  // Bytes already stored on the server for this week (COMMENTS.md excluded,
  // since it is an internal accumulation file rather than a submission).
  const uploadedBytes = (files ?? [])
    .filter((file) => file.name !== COMMENTS_FILE)
    .reduce((sum, file) => sum + (file.fileSize ?? 0), 0);

  // Files are queued as "candidates" and only uploaded when the user clicks
  // the upload button, so accidental selections are never sent to storage.
  const queueFiles = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0 || isUploading) return;
    // Reject the selection up front if it would push the week past its 256 MB cap.
    const pendingBytes = pendingFiles.reduce((sum, f) => sum + f.size, 0);
    const addedBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    if (uploadedBytes + pendingBytes + addedBytes > MAX_WEEK_BYTES) {
      toast.error("Esta semana alcanzaría el límite de 256 MB");
      return;
    }
    setPendingFiles((prev) => {
      const known = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      return [
        ...prev,
        ...selectedFiles.filter(
          (f) => !known.has(`${f.name}-${f.size}-${f.lastModified}`),
        ),
      ];
    });
  };

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Uploads candidate files and the comment. Files are uploaded one-by-one so
  // each can be attributed its own success/failure and error code. The comment
  // is sent with each file; the server appends it only once (idempotent). After
  // every file settles it refreshes the server list, cancels any file that was
  // registered server-side despite a client failure, and shows a single failure
  // popup (only after every upload has settled).
  const handleUpload = async () => {
    if (isUploading || submitComment.isPending) return;
    commentFilesRef.current = false;
    const text = comment.trim();
    if (text) {
      if (charCount > MAX_COMMENT_CHARS) {
        toast.error(`El comentario excede ${MAX_COMMENT_CHARS} caracteres`);
        return;
      }
      if (commentByteLength > MAX_COMMENT_BYTES) {
        toast.error(`El comentario excede ${MAX_COMMENT_BYTES} bytes`);
        return;
      }
    }

    const hasFiles = pendingFiles.length > 0;

    if (!hasFiles && text) {
      setComment("");
      setSubmitting(true);
      try {
        await submitComment.mutateAsync({ week: weekNumber, text });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!hasFiles) return;

    const pendingBytes = pendingFiles.reduce((sum, f) => sum + f.size, 0);
    if (uploadedBytes + pendingBytes > MAX_WEEK_BYTES) {
      toast.error("Esta semana alcanzaría el límite de 256 MB");
      return;
    }

    // Reset per-upload state and take the queue so the list clears immediately.
    const attempted = [...pendingFiles];
    setPendingFiles([]);
    setComment("");
    setUploadFailures([]);
    setUploadSucceeded(false);
    setUploadProgress(0);
    setSubmitting(true);

    // Upload each file individually so we can attribute failures + error
    // codes. The comment is NOT attached here: appending it inside every
    // file's onUploadComplete made the completion handshake slow (and could
    // hang the UI at 100%). It is sent once afterwards via submitComment.
    const failures: { name: string; errCode: string; canceled: boolean }[] = [];
    for (const file of attempted) {
      errorCodeRef.current = "";
      const res = await startUpload([file], { week: weekNumber });
      if (!res || res.length === 0) {
        failures.push({
          name: file.name,
          errCode: errorCodeRef.current || "UNKNOWN",
          canceled: false,
        });
      }
    }

    // Lift the lock immediately so the 100% bar never hangs the UI. The
    // success path does NOT wait on the (potentially slow) reconciliation
    // query; the list refresh just runs in the background.
    setSubmitting(false);

    if (failures.length === 0) {
      setUploadSucceeded(true);
      toast.success("Archivo subido correctamente");
    } else {
      // Best-effort: reconcile against the server to find files that reached
      // storage but were never acknowledged, cancel them, then show the popup.
      try {
        await utils.uploads.getByWeek.invalidate({ week: weekNumber });
        const registered =
          (await utils.uploads.getByWeek.fetch({ week: weekNumber })) ?? [];
        const registeredNames = new Set(registered.map((r) => r.name));

        let canceledAny = false;
        for (const failure of failures) {
          if (!registeredNames.has(failure.name)) continue;
          const record = registered.find((r) => r.name === failure.name);
          if (!record) continue;
          try {
            await cancelUpload.mutateAsync({ id: record.id });
            failure.canceled = true;
            canceledAny = true;
          } catch {
            // Leave it as a plain failure if the cleanup call fails.
          }
        }
        if (canceledAny) {
          await utils.uploads.getByWeek.invalidate({ week: weekNumber });
        }
      } catch {
        // If the reconciliation query fails, still show the client-side
        // failures — just without the server-side cancel status.
      }
      setUploadFailures(failures);
      setShowFailures(true);
    }

    // Send the comment once, after the files have settled. Suppressed toast:
    // the file success/popup already reports the outcome.
    if (text) {
      commentFilesRef.current = true;
      void submitComment.mutateAsync({ week: weekNumber, text });
    }

    // Keep the list fresh in the background for the success path.
    void utils.uploads.getByWeek.invalidate({ week: weekNumber });
  };

  // Character counter shown near the limit. remaining reaches 0 exactly at
  // MAX_COMMENT_CHARS and goes negative (red) past it.
  const charCount = comment.length;
  const commentByteLength = byteLength(comment);
  const remaining = MAX_COMMENT_CHARS - charCount;
  const showCounter = charCount > 0 && remaining <= COUNTER_THRESHOLD;
  const onlyComment = pendingFiles.length === 0 && !comment.trim();
  const commentBlocked =
    commentByteLength > MAX_COMMENT_BYTES ||
    charCount > MAX_COMMENT_CHARS ||
    onlyComment;

  // While an upload/comment is in flight, the upload and comment widgets are
  // greyed out and locked (overlay + disabled focusual controls). Locked only
  // after the user clicks the submit button, and always unlocked afterwards.
  // Driven by the explicit `submitting` flag so it reliably clears after the
  // operation finishes (the library's isUploading can linger with many files).
  const busy = submitting;

  // Show the progress overlay on top of the lock rectangle while a file upload
  // is actually in flight (queued files present and/or progress reported).
  const showProgress = busy && (pendingFiles.length > 0 || uploadProgress > 0);

  // "Subir comentarios" when only a comment is written; "Subir archivos"
  // when files (with or without a comment) are queued for upload.
  const buttonLabel =
    pendingFiles.length === 0 && comment.trim() ? "Subir comentarios" : "Subir archivos";

  // COMMENTS.md is an internal accumulation file, so it is hidden from the
  // uploaded-files list even though it lives in the same folder.
  const visibleFiles = (files ?? []).filter((file) => file.name !== COMMENTS_FILE);

  // Weekly size usage: everything on the server for this week plus anything
  // currently queued, shown against the 256 MB weekly cap.
  const weeklyUsageBytes =
    uploadedBytes + pendingFiles.reduce((sum, f) => sum + f.size, 0);
  const weeklyPct = Math.min(100, (weeklyUsageBytes / MAX_WEEK_BYTES) * 100);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">
          Carpeta:{" "}
          <code className="text-roboblue">
            {teamName}/week{weekNumber}/
          </code>
        </p>

        <p className="shrink-0 text-right text-xs text-neutral-400">
          {formatBytes(weeklyUsageBytes)} de 256 MB ·{" "}
          <span className={weeklyPct >= 100 ? "font-medium text-red-400" : ""}>
            {weeklyPct.toFixed(weeklyPct >= 10 ? 0 : 1)}%
          </span>
        </p>
      </div>

      {uploadSucceeded && (
        <p className="mt-2 flex items-center gap-1 text-sm font-medium text-green-400">
          <span aria-hidden>Éxito –</span> ¡Archivo(s) subido(s) correctamente!
        </p>
      )}

      <div className="relative">
        <div
          aria-disabled={busy}
          className={busy ? "pointer-events-none select-none" : undefined}
        >
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
            queueFiles(Array.from(event.dataTransfer.files));
          }}
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
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
              queueFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <p className="text-sm font-medium text-neutral-200">
            {isUploading && busy
              ? "Subiendo…"
              : `Coloca aquí tus archivos de la ${WEEK_LABELS[week]}`}
          </p>
          <p className="text-xs text-neutral-500">
            Hasta 256 MB en total por semana
          </p>
        </div>

      </div>

      <div className="mt-4 rounded-lg border border-neutral-800 bg-black/30 p-4">
        <label
          htmlFor={`comment-${weekNumber}`}
          className="text-sm font-medium text-neutral-200"
        >
          Comentario / Observaciones
        </label>
        <div className="relative mt-2">
          <textarea
            id={`comment-${weekNumber}`}
            rows={4}
            tabIndex={busy ? -1 : 0}
            readOnly={busy}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={
              "Escribe aquí tu comentario. Se guardará en COMMENTS.md " +
              "dentro de la carpeta de esta semana."
            }
            className="h-32 w-full resize-none overflow-y-auto rounded-lg border border-neutral-700 bg-black/40 p-3 pr-10 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-roboblue focus:outline-none scrollbar scrollbar-thin scrollbar-track-neutral-900 scrollbar-thumb-neutral-700"
          />
          {showCounter && (
            <div
              className={`pointer-events-none absolute bottom-2 right-3 rounded px-1 text-xs font-mono tabular-nums ${
                remaining < 0 ? "text-red-400" : "text-neutral-400"
              }`}
            >
              {remaining}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-neutral-500">
            Se guardará en{" "}
            <code className="text-roboblue">
              {teamName}/week{weekNumber}/{COMMENTS_FILE}
            </code>
          </p>
          <button
            type="button"
            tabIndex={busy ? -1 : 0}
            onClick={handleUpload}
            disabled={isUploading || submitComment.isPending || commentBlocked}
            className="shrink-0 rounded-lg bg-roboblue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-roboblue/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading || submitComment.isPending ? "Subiendo…" : buttonLabel}
          </button>
        </div>

        {pendingFiles.length > 0 && (
          <div className="mt-3 border-t border-neutral-800 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Archivos por subir ({pendingFiles.length})
            </p>
            <ul className="mt-2 space-y-2">
              {pendingFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      title="Pendiente"
                      className="h-2 w-2 shrink-0 rounded-full bg-neutral-400"
                    />
                    <span className="truncate text-sm text-neutral-300">
                      {file.name}
                    </span>
                  </span>
                  <button
                    type="button"
                    tabIndex={busy ? -1 : 0}
                    disabled={busy}
                    onClick={() => removePending(index)}
                    className="shrink-0 rounded-md px-2 py-1 text-sm text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
        </div>

        {busy && (
          <div
            aria-hidden
            className="pointer-events-auto absolute inset-0 z-10 rounded-xl bg-[#777777]/60"
          />
        )}

        {showProgress && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl"
          >
            <div className="h-1.5 w-4/5 overflow-hidden rounded-full bg-neutral-700/80">
              <div
                className="h-full rounded-full bg-green-500 transition-[width] duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-2xl font-semibold text-white">
              Subiendo… {uploadProgress}%
            </p>
          </div>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {visibleFiles.map((file) => (
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
            <span className="flex shrink-0 items-center gap-3">
              {formatBytes(file.fileSize) && (
                <span className="text-xs tabular-nums text-neutral-500">
                  {formatBytes(file.fileSize)}
                </span>
              )}
              <button
                type="button"
                onClick={() => remove.mutate({ id: file.id })}
                className="shrink-0 rounded-md px-2 py-1 text-sm text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                Eliminar
              </button>
            </span>
          </li>
        ))}
        {!isLoading && visibleFiles.length === 0 && (
          <li className="rounded-lg border border-dashed border-neutral-800 p-3 text-sm text-neutral-500">
            Todavía no hay archivos en esta semana.
          </li>
        )}
      </ul>

      {showFailures && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-900/50 bg-neutral-900 p-6 shadow-2xl">
            <h3 className="font-anton text-lg tracking-wide text-red-400">
              Error al subir archivos
            </h3>
            <ul className="mt-4 space-y-2">
              {uploadFailures.map((failure) => (
                <li key={failure.name} className="text-sm text-red-400">
                  El archivo {failure.name} no se pudo subir! Código de error:{" "}
                  {failure.errCode}
                  {failure.canceled && (
                    <span className="mt-1 block text-xs text-neutral-400">
                      La carga fue cancelada del lado del servidor.
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowFailures(false)}
              className="mt-5 w-full rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
