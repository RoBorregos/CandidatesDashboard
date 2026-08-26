"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

export default function MentorManagement() {
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  // Whose mentor access the "Mentor Access" card is currently editing.
  const [selectedAdminId, setSelectedAdminId] = useState("");

  const utils = api.useUtils();

  const { data: mentors, isLoading: mentorsLoading } =
    api.admin.getMentors.useQuery();

  const { data: allUsers } = api.admin.getAllUsers.useQuery();

  const { data: candidates, isLoading: candidatesLoading } =
    api.admin.getCandidates.useQuery();

  const {
    data: assignments = [],
    isLoading: assignmentsLoading,
    refetch: refetchAssignments,
  } = api.admin.getAssignments.useQuery();

  const assignMentor = api.admin.assignMentor.useMutation({
    onSuccess: async () => {
      toast.success("Mentor assigned successfully.");

      setSelectedCandidateId("");

      await refetchAssignments();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMentor = api.admin.removeMentor.useMutation({
    onSuccess: async () => {
      toast.success("Mentor assignment removed.");

      await refetchAssignments();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setUserMentor = api.admin.setUserMentor.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.isMentor ? "Mentor access granted." : "Mentor access removed.",
      );

      await utils.admin.getAllUsers.invalidate();
      await utils.admin.getMentors.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  /*
   * Only admins may mentor, so the picker never offers anyone else. The server
   * rejects non-admins regardless; this just avoids showing dead options.
   */
  const eligibleAdmins = useMemo(
    () => (allUsers ?? []).filter((user) => user.role === "ADMIN"),
    [allUsers],
  );

  // The admin currently picked in the Mentor Access card, if any.
  const selectedAdmin = useMemo(
    () => eligibleAdmins.find((user) => user.id === selectedAdminId) ?? null,
    [eligibleAdmins, selectedAdminId],
  );

  /*
   * A candidate is considered assigned if their registrationMemberId
   * already appears in an existing mentor assignment.
   */
  const assignedCandidateIds = useMemo(() => {
    return new Set(
      (assignments ?? [])
        .map((assignment) => assignment.registrationMember?.id)
        .filter((id): id is string => Boolean(id)),
    );
  }, [assignments]);

  /*
   * The same person can be assigned through their linked User instead of
   * their RegistrationMember, so match on that identity too — otherwise
   * they would look unassigned here and the server would reject the assign.
   */
  const assignedUserIds = useMemo(() => {
    return new Set(
      (assignments ?? [])
        .map((assignment) => assignment.user?.id)
        .filter((id): id is string => Boolean(id)),
    );
  }, [assignments]);

  /*
   * Only show contestants who don't already have a mentor.
   *
   * getCandidates currently returns RegistrationMembers for the
   * current edition, so registrationMemberId is the identifier
   * we use when creating the mentor assignment.
   */
  const unassignedCandidates = useMemo(() => {
    return (candidates ?? []).filter(
      (candidate) =>
        !assignedCandidateIds.has(candidate.id) &&
        !(candidate.userId && assignedUserIds.has(candidate.userId)),
    );
  }, [candidates, assignedCandidateIds, assignedUserIds]);

  /*
   * Search contestants by name or email.
   */
  const filteredCandidates = useMemo(() => {
    const search = candidateSearch.trim().toLowerCase();

    if (!search) {
      return unassignedCandidates;
    }

    return unassignedCandidates.filter((candidate) => {
      const name = candidate.name?.toLowerCase() ?? "";
      const email = candidate.email?.toLowerCase() ?? "";

      return name.includes(search) || email.includes(search);
    });
  }, [unassignedCandidates, candidateSearch]);

  const selectedMentor = useMemo(
    () => mentors?.find((mentor) => mentor.id === selectedMentorId) ?? null,
    [mentors, selectedMentorId],
  );

  const selectedCandidate = useMemo(
    () =>
      candidates?.find((candidate) => candidate.id === selectedCandidateId) ??
      null,
    [candidates, selectedCandidateId],
  );

  const handleAssign = () => {
    if (!selectedMentorId) {
      toast.error("Please select a mentor.");
      return;
    }

    if (!selectedCandidateId) {
      toast.error("Please select a contestant.");
      return;
    }

    if (assignedCandidateIds.has(selectedCandidateId)) {
      toast.error("This contestant already has a mentor.");
      return;
    }

    assignMentor.mutate({
      mentorId: selectedMentorId,
      registrationMemberId: selectedCandidateId,
    });
  };

  const handleRemove = (assignmentId: string) => {
    const assignment = assignments?.find((item) => item.id === assignmentId);

    const candidateName =
      assignment?.registrationMember?.name ??
      assignment?.registrationMember?.email ??
      assignment?.user?.name ??
      assignment?.user?.email ??
      "this contestant";

    const mentorName =
      assignment?.mentor?.name ?? assignment?.mentor?.email ?? "this mentor";

    const confirmed = window.confirm(
      `Remove ${mentorName} as mentor for ${candidateName}?`,
    );

    if (!confirmed) {
      return;
    }

    removeMentor.mutate({
      assignmentId,
    });
  };

  if (mentorsLoading || candidatesLoading) {
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
            Current Contestants
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {candidates?.length ?? 0}
          </p>
        </div>

        <div className="rounded-lg bg-gray-800 p-5">
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Assigned
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {assignments?.length ?? 0}
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Mentor Access */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-6">
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-white">Mentor Access</h3>

          <p className="mt-1 text-sm text-gray-400">
            Grant or revoke the mentor capability. Only admins can be mentors —
            the grant is added on top of their admin role, never replacing it.
          </p>
        </div>

        <div>
          <label
            htmlFor="mentor-access-select"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            Admin
          </label>

          <select
            id="mentor-access-select"
            value={selectedAdminId}
            onChange={(event) => setSelectedAdminId(event.target.value)}
            disabled={eligibleAdmins.length === 0 || setUserMentor.isPending}
            className="w-full rounded-md border border-gray-600 bg-gray-700 p-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select an admin...</option>

            {eligibleAdmins.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? "Unnamed admin"}
                {user.email ? ` — ${user.email}` : ""}
                {user.isMentor ? " (mentor)" : ""}
              </option>
            ))}
          </select>

          {eligibleAdmins.length === 0 && (
            <p className="mt-2 text-sm text-yellow-400">
              No admins found. A user must be an admin before they can mentor.
            </p>
          )}
        </div>

        {selectedAdmin && (
          <div className="mt-5 flex flex-col gap-4 rounded-md border border-gray-700 bg-gray-900/50 p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              <div className="font-medium text-white">
                {selectedAdmin.name ?? selectedAdmin.email ?? "Unnamed admin"}
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
      {/* Assign Mentor */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-6">
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-white">Assign Mentor</h3>

          <p className="mt-1 text-sm text-gray-400">
            Select a mentor and a current-edition contestant to create a mentor
            assignment.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Mentor */}
          <div>
            <label
              htmlFor="mentor-select"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Mentor
            </label>

            <select
              id="mentor-select"
              value={selectedMentorId}
              onChange={(event) => setSelectedMentorId(event.target.value)}
              disabled={mentors?.length === 0 || assignMentor.isPending}
              className="w-full rounded-md border border-gray-600 bg-gray-700 p-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a mentor...</option>

              {mentors?.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>
                  {mentor.name ?? "Unnamed mentor"}
                  {mentor.email ? ` — ${mentor.email}` : ""}
                  {mentor._count.mentorAssignments > 0
                    ? ` (${mentor._count.mentorAssignments} assigned)`
                    : ""}
                </option>
              ))}
            </select>

            {mentors?.length === 0 && (
              <p className="mt-2 text-sm text-yellow-400">
                No mentors yet. Use Mentor Access above to grant an admin the
                mentor capability.
              </p>
            )}
          </div>

          {/* Contestant */}
          <div>
            <label
              htmlFor="candidate-select"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Contestant
            </label>

            <select
              id="candidate-select"
              value={selectedCandidateId}
              onChange={(event) => setSelectedCandidateId(event.target.value)}
              disabled={
                filteredCandidates.length === 0 || assignMentor.isPending
              }
              className="w-full rounded-md border border-gray-600 bg-gray-700 p-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a contestant...</option>

              {filteredCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name ?? "Unnamed contestant"}
                  {candidate.email ? ` — ${candidate.email}` : ""}
                </option>
              ))}
            </select>

            {unassignedCandidates.length === 0 && (
              <p className="mt-2 text-sm text-gray-400">
                All current contestants already have a mentor.
              </p>
            )}
          </div>
        </div>

        {/* Contestant search */}
        <div className="mt-5">
          <label
            htmlFor="contestant-search"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            Search contestants
          </label>

          <input
            id="contestant-search"
            type="text"
            value={candidateSearch}
            onChange={(event) => {
              setCandidateSearch(event.target.value);

              /*
               * Clear the current selection if it no longer appears
               * in the filtered contestant list.
               */
              const value = event.target.value.toLowerCase();

              if (selectedCandidateId) {
                const selected = unassignedCandidates.find(
                  (candidate) => candidate.id === selectedCandidateId,
                );

                const name = selected?.name?.toLowerCase() ?? "";
                const email = selected?.email?.toLowerCase() ?? "";

                if (
                  !selected ||
                  (!name.includes(value) && !email.includes(value))
                ) {
                  setSelectedCandidateId("");
                }
              }
            }}
            placeholder="Search by name or email..."
            disabled={assignMentor.isPending}
            className="w-full rounded-md border border-gray-600 bg-gray-700 p-3 text-white outline-none placeholder:text-gray-500 focus:border-blue-500 disabled:opacity-50"
          />

          <p className="mt-2 text-xs text-gray-500">
            Showing {filteredCandidates.length} unassigned contestant
            {filteredCandidates.length === 1 ? "" : "s"}.
          </p>
        </div>

        {/* Selected summary */}
        {Boolean(selectedMentor ?? selectedCandidate) && (
          <div className="mt-5 rounded-md border border-gray-700 bg-gray-900/50 p-4">
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400">
              Assignment Preview
            </p>

            <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center">
              <span className="font-medium text-white">
                {selectedMentor?.name ??
                  selectedMentor?.email ??
                  "No mentor selected"}
              </span>

              <span className="hidden text-gray-500 md:block">→</span>

              <span className="text-gray-300">
                {selectedCandidate?.name ??
                  selectedCandidate?.email ??
                  "No contestant selected"}
              </span>
            </div>
          </div>
        )}

        {/* Assign button */}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedMentorId("");
              setSelectedCandidateId("");
              setCandidateSearch("");
            }}
            disabled={
              assignMentor.isPending ||
              (!selectedMentorId && !selectedCandidateId && !candidateSearch)
            }
            className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={handleAssign}
            disabled={
              !selectedMentorId ||
              !selectedCandidateId ||
              assignMentor.isPending ||
              // Duplicate prevention reads `assignments`; don't act without it.
              assignmentsLoading
            }
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assignMentor.isPending ? "Assigning..." : "Assign Mentor"}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Current Assignments */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">
              Current Assignments
            </h3>

            <p className="mt-1 text-sm text-gray-400">
              Mentors currently assigned to contestants.
            </p>
          </div>

          <span className="rounded-full bg-gray-700 px-3 py-1 text-sm text-gray-300">
            {assignments?.length ?? 0} assigned
          </span>
        </div>

        {assignmentsLoading ? (
          <div className="rounded-md border border-gray-700 p-6 text-center text-gray-400">
            Loading assignments...
          </div>
        ) : assignments?.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-700 p-8 text-center">
            <p className="font-medium text-gray-300">
              No mentor assignments yet.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Use the form above to assign a mentor to a contestant.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Mentor
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Contestant
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {(assignments ?? []).map((assignment) => {
                  const mentorName =
                    assignment.mentor.name ??
                    assignment.mentor.email ??
                    "Unnamed mentor";

                  const contestantName =
                    assignment.registrationMember?.name ??
                    assignment.registrationMember?.email ??
                    assignment.user?.name ??
                    assignment.user?.email ??
                    "Unknown contestant";

                  const contestantEmail =
                    assignment.registrationMember?.email ??
                    assignment.user?.email ??
                    null;

                  return (
                    <tr key={assignment.id} className="hover:bg-gray-750">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">
                          {mentorName}
                        </div>

                        {assignment.mentor.email && assignment.mentor.name && (
                          <div className="text-sm text-gray-500">
                            {assignment.mentor.email}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-200">
                          {contestantName}
                        </div>

                        {contestantEmail &&
                          contestantEmail !== contestantName && (
                            <div className="text-sm text-gray-500">
                              {contestantEmail}
                            </div>
                          )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(assignment.id)}
                          disabled={removeMentor.isPending}
                          className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {removeMentor.isPending ? "Removing..." : "Remove"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* Contestant Status */}
      {/* ========================================================= */}

      <div className="rounded-lg bg-gray-800 p-6">
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-white">
            Contestant Status
          </h3>

          <p className="mt-1 text-sm text-gray-400">
            Overview of contestants from the current edition and their mentor
            status.
          </p>
        </div>

        {candidates?.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
            No contestants found for the current edition.
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
                    Mentor
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {(candidates ?? []).map((candidate) => {
                  const assignment = assignments?.find(
                    (item) => item.registrationMember?.id === candidate.id,
                  );

                  const mentorName =
                    assignment?.mentor.name ?? assignment?.mentor.email ?? null;

                  return (
                    <tr key={candidate.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        {candidate.name ?? "Unnamed contestant"}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-400">
                        {candidate.email ?? "—"}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-300">
                        {mentorName ?? "—"}
                      </td>

                      <td className="px-4 py-3">
                        {assignment ? (
                          <span className="inline-flex rounded-full bg-green-900/60 px-2.5 py-1 text-xs font-medium text-green-300">
                            Assigned
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-yellow-900/60 px-2.5 py-1 text-xs font-medium text-yellow-300">
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
