"use client";

import { toast } from "sonner";
import { api } from "~/trpc/react";

export default function TeamRequestsPanel() {
  const utils = api.useUtils();

  const { data: pending, isLoading } =
    api.team.getPendingRequestsForMyTeam.useQuery();

  const approve = api.team.approveTeamRequestByMember.useMutation({
    onSuccess() {
      toast.success("Request approved");
      void utils.team.getPendingRequestsForMyTeam.invalidate();
      void utils.team.getTeam.invalidate();
    },
    onError(err) {
      toast.error(err.message || "Error approving request");
    },
  });

  const reject = api.team.rejectTeamRequestByMember.useMutation({
    onSuccess() {
      toast.success("Request rejected");
      void utils.team.getPendingRequestsForMyTeam.invalidate();
    },
    onError(err) {
      toast.error(err.message || "Error rejecting request");
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-lg bg-gray-800 p-6">Loading requests...</div>
    );
  }

  if (!pending || pending.length === 0) {
    return (
      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="mb-2 text-xl font-semibold">Join Requests</h3>
        <p className="text-sm text-gray-400">No pending requests</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-800 p-6">
      <h3 className="mb-4 text-xl font-semibold">Join Requests</h3>
      <div className="space-y-3">
        {pending.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between rounded bg-gray-700 p-4"
          >
            <div>
              <p className="font-semibold">{req.user.name ?? req.user.email}</p>
              {req.user.name && (
                <p className="text-sm text-gray-400">{req.user.email}</p>
              )}
              {req.message && (
                <p className="text-sm text-gray-400">Message: {req.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approve.mutate({ requestId: req.id })}
                disabled={approve.isPending}
                className="rounded bg-green-600 px-3 py-1 hover:bg-green-700 disabled:opacity-50"
              >
                {approve.isPending ? "..." : "Approve"}
              </button>
              <button
                onClick={() => reject.mutate({ requestId: req.id })}
                disabled={reject.isPending}
                className="rounded bg-red-600 px-3 py-1 hover:bg-red-700 disabled:opacity-50"
              >
                {reject.isPending ? "..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
