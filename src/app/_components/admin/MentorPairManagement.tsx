"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { MAX_TRACKING_WEEK } from "~/lib/rubric";

type Mentor = { name: string | null; email: string | null };

const mentorLabel = (mentor: Mentor) =>
  mentor.name ?? mentor.email ?? "Unnamed mentor";

const pairLabel = (pair: { mentorA: Mentor; mentorB: Mentor }) =>
  `${mentorLabel(pair.mentorA)} + ${mentorLabel(pair.mentorB)}`;

export default function MentorPairManagement() {
  const [mentorAId, setMentorAId] = useState("");
  const [mentorBId, setMentorBId] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [manualPairByTeam, setManualPairByTeam] = useState<
    Record<string, string>
  >({});
  const [teamFilter, setTeamFilter] = useState<"all" | "assigned" | "unassigned">(
    "all",
  );

  const utils = api.useUtils();

  const { data: pairs, isLoading: pairsLoading } =
    api.admin.getPairs.useQuery();

  const { data: unpairedMentors } = api.admin.getUnpairedMentors.useQuery();

  const { data: teams, isLoading: teamsLoading } =
    api.admin.getTeamsWithPairs.useQuery();

  const preview = api.admin.previewPairAssignment.useQuery(undefined, {
    enabled: false,
  });

  const refetchPairData = async () => {
    await utils.admin.getPairs.invalidate();
    await utils.admin.getUnpairedMentors.invalidate();
    await utils.admin.getTeamsWithPairs.invalidate();
  };

  const createPair = api.admin.createPair.useMutation({
    onSuccess: async () => {
      toast.success("Mentor pair created.");
      setMentorAId("");
      setMentorBId("");
      await refetchPairData();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const dissolvePair = api.admin.dissolvePair.useMutation({
    onSuccess: async () => {
      toast.success("Mentor pair dissolved.");
      await refetchPairData();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const commitPairAssignment = api.admin.commitPairAssignment.useMutation({
    onSuccess: async (data) => {
      toast.success(`Assigned pairs to ${data.assigned} team(s).`);
      setShowPreview(false);
      await refetchPairData();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const assignPairToTeam = api.admin.assignPairToTeam.useMutation({
    onSuccess: async () => {
      toast.success("Team's mentor pair updated.");
      await refetchPairData();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unassignPairFromTeam = api.admin.unassignPairFromTeam.useMutation({
    onSuccess: async () => {
      toast.success("Mentor pair removed from team.");
      await refetchPairData();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const clearConflict = api.admin.clearPairTeamConflict.useMutation({
    onSuccess: async () => {
      toast.success("Conflict cleared. This pair can take that team again.");
      await refetchPairData();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { data: mentorWeek } = api.admin.getMentorWeek.useQuery();

  const setMentorWeek = api.admin.setMentorWeek.useMutation({
    onSuccess: async (result) => {
      toast.success(`Weekly tracking moved to week ${result.week}.`);
      await utils.admin.getMentorWeek.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleOpenPreview = async () => {
    setShowPreview(true);
    await preview.refetch();
  };

  const handleCreatePair = () => {
    if (!mentorAId || !mentorBId) {
      toast.error("Select two mentors to form a pair.");
      return;
    }

    if (mentorAId === mentorBId) {
      toast.error("A pair needs two different mentors.");
      return;
    }

    createPair.mutate({ mentorAId, mentorBId });
  };

  const handleDissolve = (pairId: string) => {
    if (!window.confirm("Dissolve this mentor pair?")) return;
    dissolvePair.mutate({ pairId });
  };

  const allTeams = useMemo(() => teams ?? [], [teams]);

  const assignedTeams = useMemo(
    () => allTeams.filter((team) => team.assignment !== null),
    [allTeams],
  );

  const unassignedTeams = useMemo(
    () => allTeams.filter((team) => team.assignment === null),
    [allTeams],
  );

  const visibleTeams = useMemo(() => {
    if (teamFilter === "assigned") return assignedTeams;
    if (teamFilter === "unassigned") return unassignedTeams;
    return allTeams;
  }, [teamFilter, allTeams, assignedTeams, unassignedTeams]);

  const pairsAwaitingTeam = useMemo(
    () =>
      (pairs ?? []).filter(
        (pair) => pair.teams.length === 0 && pair.conflicts.length > 0,
      ),
    [pairs],
  );

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* Overview */}
      {/* ========================================================= */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-gray-800 p-5">
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Mentor Pairs
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {pairs?.length ?? 0}
          </p>
        </div>

        <div className="rounded-lg bg-gray-800 p-5">
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Unpaired Mentors
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {unpairedMentors?.length ?? 0}
          </p>
        </div>

        <div className="rounded-lg bg-gray-800 p-5">
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Teams With a Pair
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {assignedTeams.length}
            <span className="ml-1 text-base font-normal text-gray-400">
              / {allTeams.length}
            </span>
          </p>
          {unassignedTeams.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              {unassignedTeams.length} team(s) still without mentors.
            </p>
          )}
        </div>

        <div
          className={`rounded-lg p-5 ${
            pairsAwaitingTeam.length > 0 ? "bg-yellow-900/40" : "bg-gray-800"
          }`}
        >
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Pairs Awaiting a Team
          </p>
          <p
            className={`mt-1 text-3xl font-bold ${
              pairsAwaitingTeam.length > 0 ? "text-yellow-300" : "text-white"
            }`}
          >
            {pairsAwaitingTeam.length}
          </p>
          {pairsAwaitingTeam.length > 0 && (
            <p className="mt-1 text-xs text-yellow-200/80">
              Released after a conflict — no free team to move them to.
            </p>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* Weekly tracking week */}
      {/* ========================================================= */}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-800 p-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Tracking Week</h3>
          <p className="mt-1 text-sm text-gray-400">
            The week mentors fill in on their weekly sheet. They can still look
            back at earlier weeks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setMentorWeek.mutate({
                week: Math.max(1, (mentorWeek?.week ?? 1) - 1),
              })
            }
            disabled={(mentorWeek?.week ?? 1) <= 1 || setMentorWeek.isPending}
            className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            −
          </button>

          <span className="min-w-28 text-center text-lg font-bold text-white">
            Week {mentorWeek?.week ?? 1}
          </span>

          <button
            type="button"
            onClick={() =>
              setMentorWeek.mutate({
                week: Math.min(MAX_TRACKING_WEEK, (mentorWeek?.week ?? 1) + 1),
              })
            }
            disabled={
              (mentorWeek?.week ?? 1) >= MAX_TRACKING_WEEK ||
              setMentorWeek.isPending
            }
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            +
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Create Pair */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-6">
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-white">
            Create Mentor Pair
          </h3>

          <p className="mt-1 text-sm text-gray-400">
            A mentor can belong to at most one pair per edition. Each
            beginner team gets one pair.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Mentor A
            </label>
            <select
              value={mentorAId}
              onChange={(event) => setMentorAId(event.target.value)}
              disabled={createPair.isPending}
              className="w-full rounded-md border border-gray-600 bg-gray-700 p-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a mentor...</option>
              {unpairedMentors
                ?.filter((mentor) => mentor.id !== mentorBId)
                .map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name ?? "Unnamed mentor"}
                    {mentor.email ? ` — ${mentor.email}` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Mentor B
            </label>
            <select
              value={mentorBId}
              onChange={(event) => setMentorBId(event.target.value)}
              disabled={createPair.isPending}
              className="w-full rounded-md border border-gray-600 bg-gray-700 p-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a mentor...</option>
              {unpairedMentors
                ?.filter((mentor) => mentor.id !== mentorAId)
                .map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name ?? "Unnamed mentor"}
                    {mentor.email ? ` — ${mentor.email}` : ""}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleCreatePair}
            disabled={!mentorAId || !mentorBId || createPair.isPending}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createPair.isPending ? "Creating..." : "Create Pair"}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Existing Pairs */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Mentor Pairs</h3>

          <button
            type="button"
            onClick={handleOpenPreview}
            disabled={preview.isFetching}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {preview.isFetching ? "Loading..." : "Auto-Assign Teams"}
          </button>
        </div>

        {pairsLoading ? (
          <div className="rounded-md border border-gray-700 p-6 text-center text-gray-400">
            Loading pairs...
          </div>
        ) : pairs?.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-700 p-8 text-center">
            <p className="font-medium text-gray-300">No mentor pairs yet.</p>
            <p className="mt-1 text-sm text-gray-500">
              Create a pair above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Mentor A
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Mentor B
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Teams
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Reported Conflicts
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {(pairs ?? []).map((pair) => (
                  <tr key={pair.id} className="hover:bg-gray-750">
                    <td className="px-4 py-4 text-sm text-white">
                      {pair.mentorA.name ?? pair.mentorA.email}
                    </td>
                    <td className="px-4 py-4 text-sm text-white">
                      {pair.mentorB.name ?? pair.mentorB.email}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300">
                      {pair.teams.length > 0 ? (
                        pair.teams.map((t) => t.team.name).join(", ")
                      ) : pair.conflicts.length > 0 ? (
                        <span className="inline-flex rounded-full bg-yellow-900/60 px-2.5 py-1 text-xs font-medium text-yellow-300">
                          Awaiting reassignment
                        </span>
                      ) : (
                        "Unassigned"
                      )}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-300">
                      {pair.conflicts.length === 0 ? (
                        <span className="text-gray-500">—</span>
                      ) : (
                        <div className="space-y-1">
                          {pair.conflicts.map((conflict) => (
                            <div
                              key={conflict.teamId}
                              className="flex items-center gap-2"
                            >
                              <span title={`Reported by ${conflict.reportedBy.name ?? conflict.reportedBy.email ?? "a mentor"}`}>
                                {conflict.team.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  clearConflict.mutate({
                                    pairId: pair.id,
                                    teamId: conflict.teamId,
                                  })
                                }
                                disabled={clearConflict.isPending}
                                className="rounded bg-gray-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Clear
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDissolve(pair.id)}
                        disabled={dissolvePair.isPending}
                        className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Dissolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* Manual Override */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-white">
              Teams &amp; Their Mentors
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              A team takes one mentor pair at a time — assigning a new pair
              replaces the current one.
            </p>
          </div>

          <div className="flex gap-1 rounded-md bg-gray-900/70 p-1">
            {(
              [
                { id: "all", label: `All (${allTeams.length})` },
                {
                  id: "assigned",
                  label: `With mentors (${assignedTeams.length})`,
                },
                {
                  id: "unassigned",
                  label: `Without mentors (${unassignedTeams.length})`,
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTeamFilter(option.id)}
                className={`rounded px-3 py-1.5 text-xs font-medium ${
                  teamFilter === option.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {teamsLoading ? (
          <div className="rounded-md border border-gray-700 p-6 text-center text-gray-400">
            Loading teams...
          </div>
        ) : visibleTeams.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-700 p-8 text-center text-gray-400">
            {teamFilter === "unassigned"
              ? "Every active team has a mentor pair."
              : teamFilter === "assigned"
                ? "No team has a mentor pair yet."
                : "No active teams."}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleTeams.map((team) => (
              <div
                key={team.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded border-l-4 bg-gray-700 p-3 ${
                  team.assignment ? "border-green-500" : "border-gray-500"
                }`}
              >
                <div className="min-w-56">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{team.name}</span>
                    {!team.isBeginner && (
                      <span className="rounded-full bg-gray-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-300">
                        Advanced
                      </span>
                    )}
                  </div>

                  {team.assignment ? (
                    <p className="mt-1 text-sm text-green-300">
                      {pairLabel(team.assignment)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">
                      No mentor pair assigned
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={
                      manualPairByTeam[team.id] ??
                      team.assignment?.pairId ??
                      ""
                    }
                    onChange={(event) =>
                      setManualPairByTeam((prev) => ({
                        ...prev,
                        [team.id]: event.target.value,
                      }))
                    }
                    className="rounded-md border border-gray-600 bg-gray-800 p-2 text-sm text-white"
                  >
                    <option value="">Select a pair...</option>
                    {pairs?.map((pair) => (
                      <option key={pair.id} value={pair.id}>
                        {pairLabel(pair)}
                        {pair.teams.some((t) => t.teamId !== team.id)
                          ? ` — also on ${pair.teams
                              .filter((t) => t.teamId !== team.id)
                              .map((t) => t.team.name)
                              .join(", ")}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const pairId =
                        manualPairByTeam[team.id] ?? team.assignment?.pairId;

                      if (!pairId) {
                        toast.error("Select a pair first.");
                        return;
                      }

                      if (pairId === team.assignment?.pairId) {
                        toast.error("That pair already mentors this team.");
                        return;
                      }

                      assignPairToTeam.mutate({ teamId: team.id, pairId });
                    }}
                    disabled={assignPairToTeam.isPending}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {team.assignment ? "Replace" : "Assign"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!team.assignment) return;

                      if (
                        !window.confirm(
                          `Remove ${pairLabel(team.assignment)} from ${team.name}?`,
                        )
                      ) {
                        return;
                      }

                      setManualPairByTeam((prev) => ({
                        ...prev,
                        [team.id]: "",
                      }));
                      unassignPairFromTeam.mutate({ teamId: team.id });
                    }}
                    disabled={!team.assignment || unassignPairFromTeam.isPending}
                    className="rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* Auto-Assign Preview Modal */}
      {/* ========================================================= */}

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-800 p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">
              Auto-Assign Pairs to Teams
            </h3>

            {preview.isFetching && (
              <p className="py-8 text-center text-gray-400">
                Computing assignment plan...
              </p>
            )}

            {preview.isError && (
              <p className="py-4 text-center text-red-400">
                Error loading preview. Please try again.
              </p>
            )}

            {preview.data &&
              preview.data.steps.length === 0 &&
              preview.data.unassignableTeams.length === 0 && (
                <p className="py-4 text-center text-gray-400">
                  No beginner teams are waiting for a mentor pair.
                </p>
              )}

            {preview.data && preview.data.steps.length > 0 && (
              <>
                <p className="mb-4 text-sm text-gray-400">
                  {preview.data.steps.length} team(s) will be assigned a
                  mentor pair.
                </p>

                <div className="space-y-2">
                  {preview.data.steps.map((step) => (
                    <div
                      key={step.teamId}
                      className="flex items-center justify-between rounded bg-gray-700 p-3 text-sm"
                    >
                      <span className="font-medium">{step.teamName}</span>
                      <span className="text-gray-400">{step.pairName}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {preview.data && preview.data.unassignableTeams.length > 0 && (
              <div className="mt-4 rounded border border-yellow-700/60 bg-yellow-900/20 p-3">
                <p className="text-sm font-medium text-yellow-300">
                  {preview.data.unassignableTeams.length} team(s) can&apos;t be
                  auto-assigned
                </p>
                <p className="mt-1 text-xs text-yellow-200/80">
                  {(pairs?.length ?? 0) === 0
                    ? "No mentor pairs exist yet — create at least one pair first."
                    : "Every remaining pair reported knowing someone on them. Assign manually or clear a conflict."}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-300">
                  {preview.data.unassignableTeams.map((team) => (
                    <li key={team.id}>{team.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="rounded bg-gray-600 px-4 py-2 hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (preview.data) {
                    commitPairAssignment.mutate({ steps: preview.data.steps });
                  }
                }}
                disabled={
                  !preview.data ||
                  preview.data.steps.length === 0 ||
                  commitPairAssignment.isPending
                }
                className="rounded bg-purple-600 px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
              >
                {commitPairAssignment.isPending
                  ? "Assigning..."
                  : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
