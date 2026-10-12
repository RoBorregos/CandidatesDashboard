import FinalDeliverableIcon from "../../final-deliverable-icon";
import LateTag from "../../late-tag";
import {
  FINAL_DELIVERABLES,
  finalDisplayName,
  finalSlotOf,
} from "~/lib/final-deliverables";
import { formatBytes } from "~/lib/uploads";
import { FINAL_WEEK } from "~/lib/weeks";

type FinalFile = {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Mentor view of the FINAL week: only what the team delivered — the four
 * hardcoded deliverables in a 2x2 grid — and the team's shared comments.
 */
export default function FinalSubmission({
  files,
  comments,
  repository,
}: {
  files: FinalFile[];
  comments: string[];
  repository: string | null;
}) {
  const fileFor = (key: string) =>
    files.find((file) => finalSlotOf(file.name) === key);

  return (
    <>
      <div className="rounded-lg bg-gray-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-200">
          Entregables
        </h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {FINAL_DELIVERABLES.map((deliverable) => {
            const file =
              deliverable.kind === "file" ? fileFor(deliverable.key) : undefined;
            const link =
              deliverable.kind === "link" ? repository : null;
            const done = file != null || link != null;

            return (
              <div
                key={deliverable.key}
                className={`flex items-start gap-3 rounded-md border p-3 ${
                  done ? "border-green-800/60 bg-green-950/10" : "border-gray-700 bg-gray-900/40"
                }`}
              >
                <div
                  className={`shrink-0 rounded-md p-1.5 ${
                    done ? "bg-green-500/10 text-green-400" : "bg-gray-700/50 text-gray-500"
                  }`}
                >
                  <FinalDeliverableIcon
                    deliverable={deliverable.key}
                    className="h-8 w-8"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {deliverable.label}
                  </p>
                  {file ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={finalDisplayName(file.name)}
                        className="min-w-0 truncate text-xs text-blue-400 underline-offset-2 hover:underline"
                      >
                        {finalDisplayName(file.name)}
                      </a>
                      <LateTag
                        week={FINAL_WEEK}
                        uploadedAt={file.updatedAt ?? file.createdAt}
                      />
                      <span className="shrink-0 text-[10px] text-gray-500">
                        {formatBytes(file.fileSize)}
                      </span>
                    </div>
                  ) : link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link}
                      className="block truncate text-xs text-blue-400 underline-offset-2 hover:underline"
                    >
                      {link}
                    </a>
                  ) : (
                    <p className="text-xs italic text-gray-500">Sin entregar</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <div className="rounded-lg bg-gray-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-200">
          Comentarios del equipo
        </h3>
        {comments.length > 0 ? (
          <ul className="space-y-1.5">
            {comments.map((comment, index) => (
              <li
                key={index}
                className="rounded-md bg-gray-700/50 px-3 py-2 text-xs text-gray-300"
              >
                {comment}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs italic text-gray-500">
            Aquí se mostrarán los comentarios.
          </p>
        )}
      </div>
    </>
  );
}
