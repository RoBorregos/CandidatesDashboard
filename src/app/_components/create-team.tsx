"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export default function CreateTeam() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [userArea, setUserArea] = useState<
    "MECHANICS" | "ELECTRONICS" | "PROGRAMMING" | ""
  >("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

  // Query if user already has a pending request to mirror RequestForm UX
  const { data: userRequest } = api.team.getUserRequest.useQuery();

  const createTeam = api.team.createTeam.useMutation({
    onSuccess() {
      toast.success("Team created and you have been assigned!");
      setTeamName("");
      setUserArea("");
      setIsSubmitting(false);
      void utils.team.getAllTeams.invalidate();
      void utils.team.getUserRequest.invalidate();
      void utils.team.getCurrentUser.invalidate();
      // Refresh the server-rendered page and navigate to team page for clarity
      router.refresh();
      router.push("/team");
    },
    onError(error) {
      toast.error(
        error.message || "Error creating team. Please try a different name.",
      );
      setIsSubmitting(false);
    },
  });

  const handleCreateAndRequest = async () => {
    if (!teamName.trim()) {
      toast("Please enter a team name");
      return;
    }

    if (!userArea) {
      toast("Please select your area of expertise");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the team and auto-assign on the server
      await createTeam.mutateAsync({
        name: teamName.trim(),
        userArea,
      });
    } catch (err: unknown) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {userRequest && (
        <div className="rounded-lg bg-yellow-800 p-6">
          <h3 className="mb-2 text-xl font-semibold">Request Pending</h3>
          <p>
            You have already requested to join:{" "}
            <strong>{userRequest.requestedTeam}</strong>
          </p>
          <p className="mt-2 text-sm text-gray-300">
            Status: Pending admin approval
          </p>
          <p className="mt-2 text-sm text-yellow-200">
            Note: Creating a new team will cancel your pending request and
            assign you to the new team automatically.
          </p>
          {userRequest.message && (
            <p className="mt-2 text-sm text-gray-400">
              Your message: {userRequest.message}
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="mb-4 text-xl font-semibold">Create a New Team</h3>
        <p className="mb-4 text-sm text-gray-400">
          If you cannot find a suitable team to join, you can create a new team
          here. Please ensure that your team name is unique and follows our
          naming guidelines.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter a unique team name"
              className="w-full rounded border border-gray-600 bg-gray-700 p-3"
            />
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

          <button
            onClick={handleCreateAndRequest}
            disabled={!teamName.trim() || !userArea || isSubmitting}
            className="w-full rounded bg-blue-600 py-3 font-semibold transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Creating team...</span>
              </div>
            ) : (
              "Create Team"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
