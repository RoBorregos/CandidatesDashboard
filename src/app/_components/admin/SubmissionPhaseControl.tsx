"use client";

import { toast } from "sonner";

import { api } from "~/trpc/react";
import { DEFAULT_FINAL_SUBMISSION_OPEN } from "~/lib/weeks";

/*
 * Weeks / Final switch for team uploads: a single boolean, so exactly one side
 * is always open. Only that side is shown on the team screen, and the server
 * rejects uploads, comments and deletes for the other one.
 */
export default function SubmissionPhaseControl() {
  const utils = api.useUtils();
  const { data, isError, error, isLoading } =
    api.admin.getFinalSubmissionOpen.useQuery();
  const finalOpen = data ?? DEFAULT_FINAL_SUBMISSION_OPEN;

  const setFinalOpen = api.admin.setFinalSubmissionOpen.useMutation({
    onSuccess(open) {
      toast.success(
        open
          ? "Entrega FINAL abierta; semanas cerradas"
          : "Semanas 2 a 6 abiertas; entrega FINAL cerrada",
      );
      void utils.admin.getFinalSubmissionOpen.invalidate();
      void utils.uploads.getFinalSubmissionOpen.invalidate();
    },
    onError(mutationError) {
      toast.error(mutationError.message);
    },
  });

  const disabled = isLoading || isError || setFinalOpen.isPending;

  return (
    <div className="rounded-lg bg-gray-800 p-6">
      <h3 className="text-xl font-semibold text-white">Team Uploads</h3>
      <p className="mt-1 text-sm text-gray-400">
        Choose which deliveries teams can see and upload to. The other side is
        hidden and closed server-side.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <span
          className={`text-sm ${finalOpen ? "text-gray-500" : "font-medium text-white"}`}
        >
          Weeks <span className="text-xs text-gray-500">(Semana 2 – 6)</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={finalOpen}
          aria-label="Open FINAL submission"
          onClick={() => setFinalOpen.mutate({ open: !finalOpen })}
          disabled={disabled}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            finalOpen ? "bg-roboblue" : "bg-gray-600"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              finalOpen ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span
          className={`text-sm ${finalOpen ? "font-medium text-white" : "text-gray-500"}`}
        >
          Final
        </span>
      </div>

      {isError && (
        <p className="mt-3 text-sm text-red-400">
          Couldn&apos;t read the setting: {error.message}
        </p>
      )}
    </div>
  );
}
