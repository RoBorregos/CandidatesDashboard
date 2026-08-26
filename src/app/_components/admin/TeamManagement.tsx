"use client";

import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useState } from "react";
import {
  type CompetitionTrack,
  type InterviewArea,
  type RegistrationStatus,
} from "@prisma/client";

type UserDisplay = {
  id: string;
  name: string | null;
  email: string | null;
  role?: string;
  interviewArea?: InterviewArea | null;
  team?: { name: string } | null;
  registration?: {
    track: CompetitionTrack;
    status: RegistrationStatus;
  } | null;
};

type TeamDisplay = {
  id: string;
  name: string;
  _count: { members: number };
  members: UserDisplay[];
};

type PreviewStep =
  | {
      kind: "fill";
      teamName: string;
      user: { name: string | null; email: string | null; interviewArea: string | null };
      afterCount: number;
    }
  | {
      kind: "create";
      teamName: string;
      members: { name: string | null; email: string | null; interviewArea: string | null }[];
    };

interface TeamManagementProps {
  users?: UserDisplay[];
  teams?: TeamDisplay[];
  refetchAll: () => void;
}

export default function TeamManagement({
  users,
  teams,
  refetchAll,
}: TeamManagementProps) {
  const [newTeamName, setNewTeamName] = useState<string>("");
  const [userTeamSelections, setUserTeamSelections] = useState<
    Record<string, string>
  >({});
  const [showPreview, setShowPreview] = useState(false);

  const assignUser = api.admin.assignUserToTeam.useMutation({
    onSuccess() {
      toast("User assigned successfully!");
      refetchAll();
    },
    onError(error) {
      toast("Error assigning user");
      console.error(error);
    },
  });

  const removeUser = api.admin.removeUserFromTeam.useMutation({
    onSuccess() {
      toast("User removed from team successfully!");
      refetchAll();
    },
    onError(error) {
      toast("Error removing user from team");
      console.error(error);
    },
  });

  const createTeam = api.admin.createTeam.useMutation({
    onSuccess() {
      toast("Team created successfully!");
      setNewTeamName("");
      refetchAll();
    },
    onError(error) {
      toast("Error creating team");
      console.error(error);
    },
  });

  const preview = api.admin.previewAutoAssign.useQuery(undefined, {
    enabled: false,
  });

  const autoAssign = api.admin.autoAssignUsers.useMutation({
    onSuccess(data) {
      toast(
        `Auto-assigned ${data.assigned} user(s), created ${data.created} team(s). ${data.remaining} remaining.`,
      );
      setShowPreview(false);
      refetchAll();
    },
    onError(error) {
      toast("Error during auto-assign");
      console.error(error);
    },
  });

  const handleOpenPreview = async () => {
    setShowPreview(true);
    await preview.refetch();
  };

  const getDisplayName = (user: UserDisplay) => user.name ?? user.email;

  const isTeamFull = (teamName: string) => {
    const team = teams?.find((t: TeamDisplay) => t.name === teamName);
    return team && team._count.members >= 4;
  };

  const handleTeamSelection = (userId: string, teamName: string) => {
    setUserTeamSelections((prev) => ({
      ...prev,
      [userId]: teamName,
    }));
  };

  const handleAssignUser = (userId: string) => {
    const selectedTeam = userTeamSelections[userId];
    if (selectedTeam) {
      if (isTeamFull(selectedTeam)) {
        toast("Team is full. Maximum 4 members allowed.");
        return;
      }
      assignUser.mutate({ userId, teamName: selectedTeam });
      setUserTeamSelections((prev) => {
        const newSelections = { ...prev };
        delete newSelections[userId];
        return newSelections;
      });
    }
  };

  const handleRemoveUser = (
    userId: string,
    userName: string | null,
    userEmail: string | null,
  ) => {
    const displayName = userName ?? userEmail;
    if (
      window.confirm(
        `Are you sure you want to remove ${displayName} from their team?`,
      )
    ) {
      removeUser.mutate({ userId });
    }
  };

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) {
      toast("Please enter a team name");
      return;
    }
    createTeam.mutate({ name: newTeamName.trim() });
  };

  const areaBadge = (area: string | null) => {
    if (!area) return null;
    const cls =
      area === "MECHANICS"
        ? "bg-green-800"
        : area === "ELECTRONICS"
          ? "bg-yellow-800"
          : "bg-cyan-800";
    const label =
      area === "MECHANICS"
        ? "Mecanica"
        : area === "ELECTRONICS"
          ? "Electronica"
          : "Programacion";
    return (
      <span className={`rounded px-1.5 py-0.5 text-xs ${cls}`}>{label}</span>
    );
  };

  // Group preview steps by team for the modal
  const previewByTeam = (() => {
    const data = preview.data;
    if (!data) return [];
    const map = new Map<
      string,
      {
        teamName: string;
        isNew: boolean;
        additions: {
          name: string | null;
          email: string | null;
          interviewArea: string | null;
        }[];
      }
    >();
    for (const step of data.steps) {
      if (step.kind === "fill") {
        let entry = map.get(step.teamName);
        if (!entry) {
          entry = { teamName: step.teamName, isNew: false, additions: [] };
          map.set(step.teamName, entry);
        }
        entry.additions.push(step.user);
      } else {
        map.set(step.teamName, {
          teamName: step.teamName,
          isNew: true,
          additions: step.members,
        });
      }
    }
    return Array.from(map.values());
  })();

  return (
    <>
      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="mb-4 text-xl font-semibold">Create New Team</h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Team name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="flex-1 rounded border border-gray-600 bg-gray-700 p-2"
          />
          <button
            onClick={handleCreateTeam}
            disabled={createTeam.isPending}
            className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {createTeam.isPending ? "Creating..." : "Create Team"}
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Users Without Teams</h3>
          <button
            onClick={handleOpenPreview}
            disabled={preview.isFetching || autoAssign.isPending}
            className="rounded bg-purple-600 px-4 py-2 text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {autoAssign.isPending
              ? "Assigning..."
              : preview.isFetching
                ? "Loading..."
                : "Auto-Assign"}
          </button>
        </div>
        <div className="space-y-3">
          {users
            ?.filter((user) => !user.team && user.role !== "ADMIN")
            .map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded bg-gray-700 p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{getDisplayName(user)}</p>
                    {user.interviewArea && (
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          user.interviewArea === "MECHANICS"
                            ? "bg-green-800"
                            : user.interviewArea === "ELECTRONICS"
                              ? "bg-yellow-800"
                              : "bg-cyan-800"
                        }`}
                      >
                        {user.interviewArea === "MECHANICS"
                          ? "Mecanica"
                          : user.interviewArea === "ELECTRONICS"
                            ? "Electronica"
                            : "Programacion"}
                      </span>
                    )}
                    {user.registration ? (
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          user.registration.track === "ADVANCED"
                            ? "bg-purple-800"
                            : "bg-blue-800"
                        }`}
                        title={
                          user.registration.track === "ADVANCED"
                            ? "Compite solo: no necesita equipo"
                            : "Espera que le asignes equipo"
                        }
                      >
                        {user.registration.track === "ADVANCED"
                          ? "Avanzados · individual"
                          : "Principiantes"}
                      </span>
                    ) : (
                      <span
                        className="rounded bg-gray-600 px-2 py-0.5 text-xs"
                        title="No encontramos un registro con este correo"
                      >
                        sin registro
                      </span>
                    )}
                  </div>
                  {user.name && (
                    <p className="text-sm text-gray-500">{user.email}</p>
                  )}
                  <p className="text-sm text-gray-400">Role: {user.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={userTeamSelections[user.id] ?? ""}
                    onChange={(e) =>
                      handleTeamSelection(user.id, e.target.value)
                    }
                    className="rounded border border-gray-500 bg-gray-600 p-2"
                  >
                    <option value="">Select team</option>
                    {teams?.map((team) => (
                      <option
                        key={team.id}
                        value={team.name}
                        disabled={isTeamFull(team.name)}
                      >
                        {team.name} ({team._count.members}/4)
                        {team._count.members >= 4 ? " - Full" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssignUser(user.id)}
                    disabled={
                      !userTeamSelections[user.id] ||
                      assignUser.isPending ||
                      isTeamFull(userTeamSelections[user.id] ?? "")
                    }
                    className="rounded bg-green-600 px-3 py-2 hover:bg-green-700 disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="mb-4 text-xl font-semibold">Teams Overview</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams?.map((team) => (
            <div key={team.id} className="rounded bg-gray-700 p-4">
              <h4 className="mb-2 font-semibold">{team.name}</h4>
              <p className="mb-2 text-sm text-gray-400">
                Members: {team._count?.members ?? 0} / 4
                {team._count?.members >= 4 ? " - Full" : ""}
              </p>
              <div className="space-y-2">
                {team.members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded bg-gray-600 p-2 text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {getDisplayName(member)}
                      </div>
                      {member.name && (
                        <div className="text-xs text-gray-400">
                          {member.email}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        handleRemoveUser(member.id, member.name, member.email)
                      }
                      disabled={removeUser.isPending}
                      className="ml-2 rounded bg-red-500 px-2 py-1 text-xs hover:bg-red-600 disabled:opacity-50"
                      title={`Remove ${getDisplayName(member)} from team`}
                    >
                      {removeUser.isPending ? "..." : "x"}
                    </button>
                  </div>
                ))}
                {(!team.members || team.members.length === 0) && (
                  <p className="text-sm italic text-gray-500">No members</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-Assign Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-800 p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">
              Auto-Assign Preview
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

            {preview.data && preview.data.steps.length === 0 && (
              <p className="py-4 text-center text-gray-400">
                No unassigned users to assign.
              </p>
            )}

            {preview.data && preview.data.steps.length > 0 && (
              <>
                <p className="mb-4 text-sm text-gray-400">
                  {preview.data.steps.length} user(s) will be assigned.{" "}
                  {previewByTeam.filter((t) => t.isNew).length} new team(s)
                  will be created.
                  {preview.data.remaining.length > 0 &&
                    ` ${preview.data.remaining.length} user(s) could not be placed (no room left).`}
                </p>

                <div className="space-y-3">
                  {previewByTeam.map((group) => (
                    <div
                      key={group.teamName}
                      className="rounded bg-gray-700 p-3"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-medium">{group.teamName}</span>
                        {group.isNew ? (
                          <span className="rounded bg-green-800 px-1.5 py-0.5 text-xs">
                            NEW TEAM
                          </span>
                        ) : (
                          <span className="rounded bg-blue-800 px-1.5 py-0.5 text-xs">
                            EXISTING
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {group.additions.map((u, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-sm text-gray-300"
                          >
                            <span className="text-gray-500">+&nbsp;</span>
                            <span>{u.name ?? u.email}</span>
                            {areaBadge(u.interviewArea)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {preview.data.remaining.length > 0 && (
                  <div className="mt-3 rounded bg-gray-700 p-3">
                    <p className="mb-2 font-medium text-yellow-400">
                      Unplaced ({preview.data.remaining.length})
                    </p>
                    <div className="space-y-1">
                      {preview.data.remaining.map((u, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm text-gray-400"
                        >
                          <span>{u.name ?? u.email}</span>
                          {areaBadge(u.interviewArea)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="rounded bg-gray-600 px-4 py-2 hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => autoAssign.mutate()}
                disabled={
                  !preview.data ||
                  preview.data.steps.length === 0 ||
                  autoAssign.isPending
                }
                className="rounded bg-purple-600 px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
              >
                {autoAssign.isPending ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
