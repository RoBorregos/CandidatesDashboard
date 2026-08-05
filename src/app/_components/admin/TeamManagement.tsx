"use client";

import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useState } from "react";
import {
  type CompetitionTrack,
  type RegistrationStatus,
} from "@prisma/client";

type UserDisplay = {
  id: string;
  name: string | null;
  email: string | null;
  role?: string;
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
        <h3 className="mb-4 text-xl font-semibold">Users Without Teams</h3>
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
    </>
  );
}
