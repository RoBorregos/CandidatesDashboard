"use client";

import { api } from "~/trpc/react";
import { toast } from "sonner";

interface ScheduleTeam {
  id: string;
  name: string;
  isActive: boolean;
  members?: Array<{ id: string; name: string | null; email: string | null }>;
}

interface TeamStatusManagementProps {
  scheduleTeams?: ScheduleTeam[];
  refetchScheduleTeams: () => void;
}

export default function TeamStatusManagement({
  scheduleTeams,
  refetchScheduleTeams,
}: TeamStatusManagementProps) {
  const toggleTeamStatus = api.admin.toggleTeamStatus.useMutation({
    onSuccess() {
      toast("Team status updated.");
      refetchScheduleTeams();
    },
    onError(error) {
      toast("Error updating team status");
      console.error(error);
    },
  });

  const activeTeams = scheduleTeams?.filter((team) => team.isActive) ?? [];
  const inactiveTeams = scheduleTeams?.filter((team) => !team.isActive) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gray-900 p-4">
        <h3 className="mb-4 text-lg font-semibold text-green-400">
          Active Teams ({activeTeams.length})
        </h3>
        {activeTeams.length === 0 ? (
          <p className="text-gray-400">No active teams</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeTeams.map((team) => (
              <div key={team.id} className="rounded-lg bg-gray-800 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-medium">{team.name}</h4>
                  <button
                    onClick={() =>
                      toggleTeamStatus.mutate({
                        teamId: team.id,
                        isActive: false,
                      })
                    }
                    disabled={toggleTeamStatus.isPending}
                    className="rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-700 disabled:opacity-50"
                  >
                    Deactivate
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  Members: {team.members?.length ?? 0}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {inactiveTeams.length > 0 && (
        <div className="rounded-lg bg-gray-900 p-4">
          <h3 className="mb-4 text-lg font-semibold text-red-400">
            Inactive Teams ({inactiveTeams.length})
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inactiveTeams.map((team) => (
              <div
                key={team.id}
                className="rounded-lg bg-gray-800 p-3 opacity-75"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-medium">{team.name}</h4>
                  <button
                    onClick={() =>
                      toggleTeamStatus.mutate({
                        teamId: team.id,
                        isActive: true,
                      })
                    }
                    disabled={toggleTeamStatus.isPending}
                    className="rounded bg-green-600 px-2 py-1 text-xs hover:bg-green-700 disabled:opacity-50"
                  >
                    Activate
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  Members: {team.members?.length ?? 0}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
