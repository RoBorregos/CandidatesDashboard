"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";

type Team = {
  id: string;
  name: string;
  _count?: { members: number };
};

type UserRequest = {
  id: string;
  requestedTeam: string;
  message: string | null;
  status: string;
};

type RequestFormProps = {
  teams: Team[];
  userRequest: UserRequest | null;
};

export default function RequestForm({ teams, userRequest }: RequestFormProps) {
  const [requestedTeam, setRequestedTeam] = useState("");
  const [message, setMessage] = useState("");
  const [userArea, setUserArea] = useState<
    "MECHANICS" | "ELECTRONICS" | "PROGRAMMING" | ""
  >("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

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

    if (!userArea) {
      toast("Please select your area of expertise");
      return;
    }

    requestTeam.mutate({
      requestedTeam,
      message: message.trim() || undefined,
      userArea,
    });
  };

  if (userRequest) {
    return (
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
          <h3 className="mb-4 text-xl font-semibold">Update Your Request</h3>
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
                {teams?.map((team) => (
                  <option
                    key={team.id}
                    value={team.name}
                    disabled={(team._count?.members ?? 0) >= 4}
                  >
                    {team.name} ({team._count?.members ?? 0}/4 members)
                    {(team._count?.members ?? 0) >= 4 ? " - Full" : ""}
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
    );
  }

  return (
    <div className="rounded-lg bg-gray-800 p-6">
      <h3 className="mb-4 text-xl font-semibold">Request Team Assignment</h3>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Select Team</label>
          <select
            value={requestedTeam}
            onChange={(e) => setRequestedTeam(e.target.value)}
            className="w-full rounded border border-gray-600 bg-gray-700 p-3"
          >
            <option value="">Choose a team...</option>
            {teams?.map((team) => (
              <option
                key={team.id}
                value={team.name}
                disabled={(team._count?.members ?? 0) >= 4}
              >
                {team.name} ({team._count?.members ?? 0}/4 members)
                {(team._count?.members ?? 0) >= 4 ? " - Full" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Your Area of Expertise
          </label>
          <select
            value={userArea}
            onChange={(e) =>
              setUserArea(
                e.target.value as "MECHANICS" | "ELECTRONICS" | "PROGRAMMING",
              )
            }
            className="w-full rounded border border-gray-600 bg-gray-700 p-3"
          >
            <option value="">Choose your area...</option>
            <option value="MECHANICS">Mechanics</option>
            <option value="ELECTRONICS">Electronics</option>
            <option value="PROGRAMMING">Programming</option>
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
          disabled={!requestedTeam || !userArea || isSubmitting}
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
  );
}
