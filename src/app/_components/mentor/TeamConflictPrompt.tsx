"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { toast } from "sonner";

interface TeamConflictPromptProps {
  teamId: string;
  teamName: string;
  myKnowsTeam: boolean | null;
}

export default function TeamConflictPrompt({
  teamId,
  teamName,
  myKnowsTeam,
}: TeamConflictPromptProps) {
  const router = useRouter();

  const reportConflict = api.mentor.reportTeamConflict.useMutation({
    onSuccess: (result) => {
      if (result.reassigned) {
        toast.success(
          result.newTeamId
            ? "You've been reassigned to a different team."
            : "No other team is available right now — your pair is pending reassignment.",
        );
      } else {
        toast.success("Team confirmed.");
      }
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (myKnowsTeam !== null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold text-white">
          Do you know anyone on {teamName}?
        </h3>

        <p className="mb-6 text-sm text-gray-400">
          To keep mentoring fair, let us know if you already know someone on
          this team. If you do, you'll be reassigned to a different team.
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              reportConflict.mutate({ teamId, knowsSomeone: false })
            }
            disabled={reportConflict.isPending}
            className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            No, I don't know anyone
          </button>

          <button
            type="button"
            onClick={() =>
              reportConflict.mutate({ teamId, knowsSomeone: true })
            }
            disabled={reportConflict.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reportConflict.isPending ? "Saving..." : "Yes, I know someone"}
          </button>
        </div>
      </div>
    </div>
  );
}
