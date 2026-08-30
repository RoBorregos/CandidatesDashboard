"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

export default function MentorManagement() {
  // Whose mentor access the "Mentor Access" card is currently editing.
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [hideRegistered, setHideRegistered] = useState(true);

  const utils = api.useUtils();

  const { data: mentors, isLoading: mentorsLoading } =
    api.admin.getMentors.useQuery();

  const { data: allUsers } = api.admin.getMentorEligibleUsers.useQuery();

  /*
   * Advanced contestants are mentored by challenge, so this one query carries
   * both the contestant list and who covers each of them.
   */
  const { data: challengeGroups, isLoading: challengeGroupsLoading } =
    api.admin.getChallengeGroups.useQuery();

  const setUserMentor = api.admin.setUserMentor.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.isMentor ? "Mentor access granted." : "Mentor access removed.",
      );

      await utils.admin.getMentorEligibleUsers.invalidate();
      await utils.admin.getMentors.invalidate();
      // Revoking mentor access drops that person's challenge groups.
      await utils.admin.getChallengeGroups.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Any user is eligible to be a mentor, independent of their role.
  const eligibleUsers = useMemo(() => allUsers ?? [], [allUsers]);

  /*
   * Every account that ever logged in lands in this list, so it is mostly
   * contestants. Hide whoever filled this edition's registration and let a
   * search narrow the rest — a mentor is never someone who registered.
   * Already-granted mentors stay visible so access can be revoked.
   */
  const visibleUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();

    return eligibleUsers.filter((user) => {
      if (hideRegistered && user.hasRegistration && !user.isMentor) {
        return false;
      }

      if (!search) return true;

      const name = user.name?.toLowerCase() ?? "";
      const email = user.email?.toLowerCase() ?? "";

      return name.includes(search) || email.includes(search);
    });
  }, [eligibleUsers, hideRegistered, userSearch]);

  // Only what the registration filter hides, so the count doesn't move with the search.
  const hiddenCount = useMemo(
    () =>
      eligibleUsers.filter((user) => user.hasRegistration && !user.isMentor)
        .length,
    [eligibleUsers],
  );

  // The user currently picked in the Mentor Access card, if any.
  const selectedAdmin = useMemo(
    () => eligibleUsers.find((user) => user.id === selectedAdminId) ?? null,
    [eligibleUsers, selectedAdminId],
  );

  /*
   * One flat, alphabetical row per advanced contestant. `ungrouped` holds the
   * ones whose challenge is missing or no longer offered — nobody covers those,
   * so they have to stay visible instead of dropping out of the list.
   */
  const contestants = useMemo(() => {
    const fromGroups = (challengeGroups?.groups ?? []).flatMap((group) =>
      group.candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        challenge: group.challenge as string | null,
        mentors: group.mentors,
      })),
    );

    const fromUngrouped = (challengeGroups?.ungrouped ?? []).map(
      (candidate) => ({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        challenge: candidate.challenge,
        mentors: [] as (typeof fromGroups)[number]["mentors"],
      }),
    );

    return [...fromGroups, ...fromUngrouped].sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? ""),
    );
  }, [challengeGroups]);

  const uncoveredCount = useMemo(
    () => contestants.filter((c) => c.mentors.length === 0).length,
    [contestants],
  );

  if (mentorsLoading || challengeGroupsLoading) {
    return (
      <div className="rounded-lg bg-gray-800 p-6">
        <p className="text-gray-300">Loading mentor management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* Overview */}
      {/* ========================================================= */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-gray-800 p-5">
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Mentors
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {mentors?.length ?? 0}
          </p>
        </div>

        <div className="rounded-lg bg-gray-800 p-5">
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Advanced Contestants
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {contestants.length}
          </p>
        </div>

        <div
          className={`rounded-lg p-5 ${
            uncoveredCount > 0 ? "bg-yellow-900/40" : "bg-gray-800"
          }`}
        >
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Contestants With No Mentor
          </p>
          <p
            className={`mt-1 text-3xl font-bold ${
              uncoveredCount > 0 ? "text-yellow-300" : "text-white"
            }`}
          >
            {uncoveredCount}
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* How mentoring is assigned */}
      {/* ========================================================= */}

      <div className="rounded-lg border border-blue-800/60 bg-blue-900/20 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-300">
          Where mentors are assigned
        </h3>

        <ul className="mt-2 space-y-1 text-sm text-blue-100/80">
          <li>
            <strong className="text-blue-100">Advanced</strong> — mentors are
            picked per challenge in the{" "}
            <strong className="text-blue-100">Challenge Mentors</strong> tab and
            cover everyone registered for that challenge.
          </li>
          <li>
            <strong className="text-blue-100">Beginners</strong> — mentored as a
            team by a pair, in the{" "}
            <strong className="text-blue-100">Mentor Pairs</strong> tab.
          </li>
        </ul>

        <p className="mt-2 text-sm text-blue-100/80">
          This tab only grants and revokes the mentor capability itself.
        </p>
      </div>

      {/* ========================================================= */}
      {/* Mentor Access */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-6">
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-white">Mentor Access</h3>

          <p className="mt-1 text-sm text-gray-400">
            Grant or revoke the mentor capability. Mentor access is
            independent of a user&apos;s role — any user can be a mentor.
          </p>
        </div>

        <div>
          <label
            htmlFor="mentor-access-search"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            User
          </label>

          <input
            id="mentor-access-search"
            type="text"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-md border border-gray-600 bg-gray-700 p-3 text-white outline-none focus:border-blue-500"
          />

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={hideRegistered}
              onChange={(event) => setHideRegistered(event.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700"
            />
            <span>
              Hide people who filled this edition&apos;s registration
              {hideRegistered && hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ""}
            </span>
          </label>

          <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-gray-700">
            {visibleUsers.length === 0 ? (
              <p className="p-4 text-sm text-yellow-400">
                {eligibleUsers.length === 0
                  ? "No users found."
                  : "No user matches this search. Try clearing the filter above."}
              </p>
            ) : (
              visibleUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedAdminId(user.id)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-gray-700 px-3 py-2 text-left last:border-b-0 hover:bg-gray-700 ${
                    selectedAdminId === user.id ? "bg-gray-700" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-white">
                      {user.name ?? "Unnamed user"}
                    </span>
                    <span className="block truncate text-xs text-gray-400">
                      {user.email ?? "—"}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-1">
                    {user.isMentor && (
                      <span className="rounded-full bg-green-900/60 px-2 py-0.5 text-xs font-medium text-green-300">
                        Mentor
                      </span>
                    )}
                    {user.isStaff && (
                      <span className="rounded-full bg-blue-900/60 px-2 py-0.5 text-xs font-medium text-blue-300">
                        Staff
                      </span>
                    )}
                    {user.hasRegistration && (
                      <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-300">
                        Registered
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedAdmin && (
          <div className="mt-5 flex flex-col gap-4 rounded-md border border-gray-700 bg-gray-900/50 p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              <div className="font-medium text-white">
                {selectedAdmin.name ?? selectedAdmin.email ?? "Unnamed user"}
              </div>

              <div className="text-gray-400">{selectedAdmin.email ?? "—"}</div>
            </div>

            <div className="flex items-center gap-3">
              {selectedAdmin.isMentor ? (
                <span className="inline-flex rounded-full bg-green-900/60 px-2.5 py-1 text-xs font-medium text-green-300">
                  Mentor
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300">
                  Not a mentor
                </span>
              )}

              <button
                type="button"
                onClick={() =>
                  setUserMentor.mutate({
                    userId: selectedAdmin.id,
                    isMentor: !selectedAdmin.isMentor,
                  })
                }
                disabled={setUserMentor.isPending}
                className={`rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                  selectedAdmin.isMentor
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {setUserMentor.isPending
                  ? "Saving..."
                  : selectedAdmin.isMentor
                    ? "Remove Mentor"
                    : "Make Mentor"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* Contestant Status */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-6">
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-white">
            Contestant Status (Advanced)
          </h3>

          <p className="mt-1 text-sm text-gray-400">
            Every advanced contestant of the current edition and the mentors
            covering their challenge. Change these in the Challenge Mentors tab.
          </p>
        </div>

        {contestants.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
            No advanced contestants found for the current edition.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Contestant
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Email
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Challenge
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Mentors
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {contestants.map((contestant) => (
                  <tr key={contestant.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm font-medium text-white">
                      {contestant.name ?? "Unnamed contestant"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-400">
                      {contestant.email ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-300">
                      {contestant.challenge ?? (
                        <span className="text-yellow-400">No challenge</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-300">
                      {contestant.mentors.length === 0
                        ? "—"
                        : contestant.mentors
                            .map(
                              (mentor) =>
                                mentor.name ?? mentor.email ?? "Unnamed mentor",
                            )
                            .join(", ")}
                    </td>

                    <td className="px-4 py-3">
                      {contestant.mentors.length > 0 ? (
                        <span className="inline-flex rounded-full bg-green-900/60 px-2.5 py-1 text-xs font-medium text-green-300">
                          Covered ({contestant.mentors.length})
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-yellow-900/60 px-2.5 py-1 text-xs font-medium text-yellow-300">
                          No mentor
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
