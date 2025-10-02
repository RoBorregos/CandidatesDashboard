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
        <div className="container mx-auto p-4 max-w-2xl">
          <div className="bg-green-800 p-6 rounded-lg text-center">
            <h3 className="text-xl font-semibold mb-2">You're already assigned!</h3>
            <p>You are part of team: <strong>{user.team.name}</strong></p>
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
      
      <div className="container mx-auto p-4 max-w-2xl space-y-6">
        
        {userRequest ? (
          <div className="bg-yellow-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Request Pending</h3>
            <p>You have already requested to join: <strong>{userRequest.requestedTeam}</strong></p>
            <p className="text-sm text-gray-300 mt-2">
              Status: Pending admin approval
            </p>
            {userRequest.message && (
              <p className="text-sm text-gray-400 mt-2">
                Your message: {userRequest.message}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Request Team Assignment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Team
                </label>
                <select
                  value={requestedTeam}
                  onChange={(e) => setRequestedTeam(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600"
                >
                  <option value="">Choose a team...</option>
                  {teams?.map((team: any) => (
                    <option key={team.id} value={team.name}>
                      {team.name} ({team._count?.members || 0} members)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Why do you want to join this team?"
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600 h-24"
                />
              </div>

              <button
                onClick={handleSubmitRequest}
                disabled={!requestedTeam || requestTeam.isPending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                {requestTeam.isPending ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        )}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Available Teams</h3>
          <div className="space-y-3">
            {teams?.map((team: any) => (
              <div key={team.id} className="bg-gray-700 p-4 rounded">
                <h4 className="font-semibold">{team.name}</h4>
                <p className="text-sm text-gray-400">
                  {team._count?.members || 0} members
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}