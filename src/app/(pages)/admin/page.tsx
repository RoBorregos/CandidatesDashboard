"use client";

import Header from "rbrgs/app/_components/header";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminPage() {
  const [newTeamName, setNewTeamName] = useState<string>("");
  const [userTeamSelections, setUserTeamSelections] = useState<Record<string, string>>({});
  const { data: users, refetch: refetchUsers } = api.admin.getAllUsers.useQuery();
  const { data: teams, refetch: refetchTeams } = api.admin.getAllTeams.useQuery();
  const { data: pendingRequests, refetch: refetchRequests } = api.admin.getPendingRequests.useQuery();

  const getDisplayName = (user: any) => {
    return user.name || user.email;
  };
  const assignUser = api.admin.assignUserToTeam.useMutation({
    onSuccess() {
      toast("User assigned successfully!");
      refetchUsers();
      refetchTeams();
      refetchRequests();
    },
    onError(error) {
      toast("Error assigning user");
      console.error(error);
    },
  });
  const removeUser = api.admin.removeUserFromTeam.useMutation({
    onSuccess() {
      toast("User removed from team successfully!");
      refetchUsers();
      refetchTeams();
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
      refetchTeams();
    },
    onError(error) {
      toast("Error creating team");
      console.error(error);
    },
  });
  const approveRequest = api.admin.approveTeamRequest.useMutation({
    onSuccess() {
      toast("Request approved!");
      refetchUsers();
      refetchTeams();
      refetchRequests();
    },
    onError(error) {
      toast("Error approving request");
      console.error(error);
    },
  });
  const rejectRequest = api.admin.rejectTeamRequest.useMutation({
    onSuccess() {
      toast("Request rejected!");
      refetchRequests();
    },
    onError(error) {
      toast("Error rejecting request");
      console.error(error);
    },
  });
  const handleTeamSelection = (userId: string, teamName: string) => {
    setUserTeamSelections(prev => ({
      ...prev,
      [userId]: teamName
    }));
  };

  const handleAssignUser = (userId: string) => {
    const selectedTeam = userTeamSelections[userId];
    if (selectedTeam) {
      assignUser.mutate({ userId, teamName: selectedTeam });
      setUserTeamSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[userId];
        return newSelections;
      });
    }
  };

  const handleRemoveUser = (userId: string, userEmail: string) => {
    if (window.confirm(`Are you sure you want to remove ${userEmail} from their team?`)) {
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
    <main className="min-h-screen bg-black text-sm text-white md:text-base">
      <div className="pt-16">
        <Header title="Admin" subtitle="Team Management" />
      </div>
      
      <div className="container mx-auto p-4 space-y-6 max-w-6xl">
        {pendingRequests && pendingRequests.length > 0 && (
          <div className="bg-yellow-900 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Pending Team Requests</h3>
            <div className="space-y-3">
              {pendingRequests.map((request: any) => (
                <div key={request.id} className="bg-yellow-800 p-4 rounded flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{getDisplayName(request.user)}</p>
                    {request.user.name && (
                      <p className="text-sm text-gray-400">{request.user.email}</p>
                    )}
                    <p className="text-sm text-gray-300">Requested team: {request.requestedTeam}</p>
                    {request.message && (
                      <p className="text-sm text-gray-400">Message: {request.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveRequest.mutate({ requestId: request.id })}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectRequest.mutate({ requestId: request.id })}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Create New Team</h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="flex-1 p-2 bg-gray-700 rounded border border-gray-600"
            />
            <button
              onClick={handleCreateTeam}
              disabled={createTeam.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              {createTeam.isPending ? "Creating..." : "Create Team"}
            </button>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Users Without Teams</h3>
          <div className="space-y-3">
            {users?.filter((user: any) => !user.team && user.role !== 'ADMIN').map((user: any) => (
              <div key={user.id} className="bg-gray-700 p-4 rounded flex justify-between items-center">
                <div>
                  <p className="font-semibold">{getDisplayName(user)}</p>
                  {user.name && (
                    <p className="text-sm text-gray-500">{user.email}</p>
                  )}
                  <p className="text-sm text-gray-400">Role: {user.role}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={userTeamSelections[user.id] || ""} 
                    onChange={(e) => handleTeamSelection(user.id, e.target.value)} 
                    className="p-2 bg-gray-600 rounded border border-gray-500"
                  >
                    <option value="">Select team</option>
                    {teams?.map((team: any) => (
                      <option key={team.id} value={team.name}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssignUser(user.id)} 
                    disabled={!userTeamSelections[user.id] || assignUser.isPending}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Teams Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams?.map((team: any) => (
              <div key={team.id} className="bg-gray-700 p-4 rounded">
                <h4 className="font-semibold mb-2">{team.name}</h4>
                <p className="text-sm text-gray-400 mb-2">
                  Members: {team._count?.members || 0}
                </p>
                <div className="space-y-2">
                  {team.members?.map((member: any) => (
                    <div key={member.id} className="flex justify-between items-center text-sm bg-gray-600 p-2 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{getDisplayName(member)}</div>
                        {member.name && (
                          <div className="text-xs text-gray-400">{member.email}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveUser(member.id, member)}
                        disabled={removeUser.isPending}
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs disabled:opacity-50 ml-2"
                        title={`Remove ${getDisplayName(member)} from team`}
                      >
                        {removeUser.isPending ? "..." : "×"}
                      </button>
                    </div>
                  ))}
                  {(!team.members || team.members.length === 0) && (
                    <p className="text-sm text-gray-500 italic">No members</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}