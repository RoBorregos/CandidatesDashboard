"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import Header from "~/app/_components/header";

export default function TeamRequestPage() {
  const [requestedTeam, setRequestedTeam] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

  const { data: user } = api.team.getCurrentUser.useQuery();
  const { data: teams } = api.team.getAllTeams.useQuery();
  const { data: userRequest } = api.team.getUserRequest.useQuery();

  const requestTeam = api.team.requestTeamAssignment.useMutation({
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess() {
      toast.success("Team request submitted successfully!");
      setRequestedTeam("");
      setMessage("");
      setIsSubmitting(false);
      void utils.team.getUserRequest.invalidate();
      void utils.team.getCurrentUser.invalidate();
    },
    onError(error) {
      toast.error("Error submitting request: " + error.message);
      console.error(error);
      setIsSubmitting(false);
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
          <div className="space-y-6">
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

            <div className="rounded-lg bg-gray-800 p-6">
              <h3 className="mb-4 text-xl font-semibold">
                Update Your Request
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                You can update your team preference and message below:
              </p>

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
                      <option
                        key={team.id}
                        value={team.name}
                        disabled={team._count?.members >= 4}
                      >
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
                  disabled={!requestedTeam || isSubmitting}
                  className="w-full rounded bg-orange-600 py-3 font-semibold transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Updating...</span>
                    </div>
                  ) : (
                    "Update Request"
                  )}
                </button>
              </div>
            </div>
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
                    <option
                      key={team.id}
                      value={team.name}
                      disabled={team._count?.members >= 4}
                    >
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
                disabled={!requestedTeam || isSubmitting}
                className="w-full rounded bg-blue-600 py-3 font-semibold transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  "Submit Request"
                )}
              </button>
            </div>
          </div>
        )}
        <div className="rounded-lg bg-gray-800 p-6">
          <h3 className="mb-4 text-xl font-semibold">Available Teams</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {teams?.map((team: any) => (
              <div
                key={team.id}
                className={`rounded border-l-4 p-4 ${
                  team._count?.members >= 4
                    ? "border-red-500 bg-red-900"
                    : "border-blue-500 bg-gray-700"
                }`}
              >
                <h4 className="text-lg font-semibold">{team.name}</h4>
                <p
                  className={`text-sm ${
                    team._count?.members >= 4 ? "text-red-300" : "text-gray-400"
                  }`}
                >
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
