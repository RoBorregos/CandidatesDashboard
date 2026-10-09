"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";

/** Date -> the "YYYY-MM-DDTHH:mm" that datetime-local expects, in local time. */
function toInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/*
 * Deadline for the advanced track's hand-in (bitácora, repo, demo video).
 * Past it candidates can't upload or change anything, and items stamped
 * after it show as late to the mentors.
 */
export default function AdvancedDeadlineControl() {
  const { data: dueAt, refetch } = api.admin.getAdvancedDeadline.useQuery();
  const [input, setInput] = useState("");

  useEffect(() => {
    if (dueAt) setInput(toInputValue(dueAt));
  }, [dueAt]);

  const setDeadline = api.admin.setAdvancedDeadline.useMutation({
    onSuccess() {
      toast.success("Fecha límite actualizada");
      void refetch();
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const closed = dueAt != null && Date.now() > dueAt.getTime();

  return (
    <div className="rounded-lg bg-gray-800 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xl font-semibold text-white">
          Advanced Submission Deadline
        </h3>
        {dueAt && (
          <span
            className={`rounded px-2 py-1 text-xs font-semibold ${
              closed ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {closed ? "CLOSED" : "OPEN"}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-400">
        After this time advanced candidates can no longer upload or change their
        bitácora, repo link or demo video. Anything handed in after it is tagged
        late.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-gray-400">Fecha y hora</label>
          <input
            type="datetime-local"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="block rounded border border-gray-600 bg-gray-700 p-2 text-sm text-white"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (!input) {
              toast.error("Elige una fecha y hora");
              return;
            }
            setDeadline.mutate({ dueAt: new Date(input) });
          }}
          disabled={setDeadline.isPending}
          className="rounded bg-roboblue px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
        >
          {setDeadline.isPending ? "Saving..." : "Save deadline"}
        </button>
      </div>
    </div>
  );
}
