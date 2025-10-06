"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import Header from "rbrgs/app/_components/header";

export default function TeamRequestPage() {
  const [requestedTeam, setRequestedTeam] = useState("");
  const [message, setMessage] = useState("");

  const { data: user } = api.team.getCurrentUser.useQuery();
  const { data: teams } = api.team.getAllTeams.useQuery();
  const { data: userRequest } = api.team.getUserRequest.useQuery();

  const requestTeam = api.team.requestTeamAssignment.useMutation({
    onSuccess() {
      toast("Team request submitted successfully!");
      setRequestedTeam("");
      setMessage("");
    },
    onError(error) {
      toast("Error submitting request");
      console.error(error);
    },
  });

  const handleSubmitRequest = () => {
    if (!requestedTeam) {
      toast("Please select a team");
      return;
    }

    requestTeam.mutate({
      requestedTeam,
      message: message.trim() || undefined,
    });
  };

  if (user?.team) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="pt-16">
          <Header title="Team Assignment" subtitle="Already Assigned" />
        </div>
        <div className="container mx-auto max-w-2xl p-4">
          <div className="rounded-lg bg-green-800 p-6 text-center">
            <h3 className="mb-2 text-xl font-semibold">
              You're already assigned!
            </h3>
            <p>
              You are part of team: <strong>{user.team.name}</strong>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pt-16">
        <Header title="Team Request" subtitle="Request Team Assignment" />
      </div>

      <div className="container mx-auto max-w-2xl space-y-6 p-4">
        {userRequest ? (
          <div className="rounded-lg bg-yellow-800 p-6">
            <h3 className="mb-2 text-xl font-semibold">Request Pending</h3>
            <p>
              You have already requested to join:{" "}
              <strong>{userRequest.requestedTeam}</strong>
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Status: Pending admin approval
            </p>
            {userRequest.message && (
              <p className="mt-2 text-sm text-gray-400">
                Your message: {userRequest.message}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-800 p-6">
            <h3 className="mb-4 text-xl font-semibold">
              Request Team Assignment
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Select Team
                </label>
                <select
                  value={requestedTeam}
                  onChange={(e) => setRequestedTeam(e.target.value)}
                  className="w-full rounded border border-gray-600 bg-gray-700 p-3"
                >
                  <option value="">Choose a team...</option>
                  {teams?.map((team: any) => (
                    <option key={team.id} value={team.name} disabled={team._count?.members >= 4}>
                      {team.name} ({team._count?.members || 0}/4 members)
                      {team._count?.members >= 4 ? " - Full" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Why do you want to join this team?"
                  className="h-24 w-full rounded border border-gray-600 bg-gray-700 p-3"
                />
              </div>

              <button
                onClick={handleSubmitRequest}
                disabled={!requestedTeam || requestTeam.isPending}
                className="w-full rounded bg-blue-600 py-3 hover:bg-blue-700 disabled:opacity-50"
              >
                {requestTeam.isPending ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        )}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Available Teams</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams?.map((team: any) => (
              <div 
                key={team.id} 
                className={`p-4 rounded border-l-4 ${
                  team._count?.members >= 4 
                    ? 'bg-red-900 border-red-500' 
                    : 'bg-gray-700 border-blue-500'
                }`}
              >
                <h4 className="font-semibold text-lg">{team.name}</h4>
                <p className={`text-sm ${
                  team._count?.members >= 4 ? 'text-red-300' : 'text-gray-400'
                }`}>
                  {team._count?.members || 0}/4 members
                  {team._count?.members >= 4 && " - FULL"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
