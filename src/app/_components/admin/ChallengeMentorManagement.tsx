"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

export default function ChallengeMentorManagement() {
  const utils = api.useUtils();

  const { data, isLoading } = api.admin.getChallengeGroups.useQuery();
  const { data: mentors } = api.admin.getMentors.useQuery();

  /*
   * Checkbox state per challenge, seeded from the server once the groups load
   * and left alone afterwards so an in-progress edit survives a refetch.
   */
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!data || seeded) return;

    setSelection(
      Object.fromEntries(
        data.groups.map((group) => [
          group.challenge,
          group.mentors.map((mentor) => mentor.id),
        ]),
      ),
    );
    setSeeded(true);
  }, [data, seeded]);

  const setChallengeMentors = api.admin.setChallengeMentors.useMutation({
    onSuccess: async () => {
      toast.success("Challenge mentors updated.");
      await utils.admin.getChallengeGroups.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleMentor = (challenge: string, mentorId: string) => {
    setSelection((prev) => {
      const current = prev[challenge] ?? [];

      return {
        ...prev,
        [challenge]: current.includes(mentorId)
          ? current.filter((id) => id !== mentorId)
          : [...current, mentorId],
      };
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg bg-gray-800 p-6 text-center text-gray-400">
        Loading challenge groups...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="text-xl font-semibold text-white">
          Mentors by Challenge
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          Advanced candidates are already grouped by the challenge they
          registered for. Pick the mentors that cover each challenge — they
          mentor every candidate in that group.
        </p>
      </div>

      {data?.groups.map((group) => {
        const selected = selection[group.challenge] ?? [];

        const saved = group.mentors.map((mentor) => mentor.id);
        const dirty =
          selected.length !== saved.length ||
          selected.some((id) => !saved.includes(id));

        return (
          <div key={group.challenge} className="rounded-lg bg-gray-800 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-white">{group.challenge}</h4>
                <p className="mt-1 text-sm text-gray-400">
                  {group.candidates.length} candidate
                  {group.candidates.length === 1 ? "" : "s"} ·{" "}
                  {group.mentors.length} mentor
                  {group.mentors.length === 1 ? "" : "s"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setChallengeMentors.mutate({
                    challenge: group.challenge,
                    mentorIds: selected,
                  })
                }
                disabled={!dirty || setChallengeMentors.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {setChallengeMentors.isPending ? "Saving..." : "Save mentors"}
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Mentors
                </p>

                {(mentors ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No mentors yet — grant mentor access in the Mentors tab.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded border border-gray-700 p-3">
                    {(mentors ?? []).map((mentor) => (
                      <label
                        key={mentor.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(mentor.id)}
                          onChange={() =>
                            toggleMentor(group.challenge, mentor.id)
                          }
                          className="h-4 w-4 rounded border-gray-600 bg-gray-700"
                        />
                        <span>
                          {mentor.name ?? "Unnamed mentor"}
                          {mentor.email ? (
                            <span className="text-gray-500">
                              {" "}
                              — {mentor.email}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Candidates
                </p>

                {group.candidates.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No advanced candidates registered for this challenge.
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded border border-gray-700">
                    <table className="w-full table-auto border-collapse text-sm">
                      <tbody>
                        {group.candidates.map((candidate) => (
                          <tr
                            key={candidate.id}
                            className="border-b border-gray-700 last:border-b-0"
                          >
                            <td className="px-3 py-2">
                              <div className="text-white">{candidate.name}</div>
                              <div className="text-xs text-gray-400">
                                {candidate.email}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-gray-400">
                              {candidate.interviewArea ?? "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {data && data.ungrouped.length > 0 && (
        <div className="rounded-lg border border-yellow-700/60 bg-yellow-900/20 p-6">
          <h4 className="font-semibold text-yellow-300">
            {data.ungrouped.length} candidate
            {data.ungrouped.length === 1 ? "" : "s"} without a known challenge
          </h4>
          <p className="mt-1 text-xs text-yellow-200/80">
            Their registration has no challenge, or one that is no longer in the
            list. They belong to no group, so no mentor covers them.
          </p>

          <ul className="mt-3 space-y-1 text-sm text-gray-200">
            {data.ungrouped.map((candidate) => (
              <li key={candidate.id}>
                {candidate.name}{" "}
                <span className="text-gray-400">({candidate.email})</span>
                {candidate.challenge ? (
                  <span className="text-gray-500"> — {candidate.challenge}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
