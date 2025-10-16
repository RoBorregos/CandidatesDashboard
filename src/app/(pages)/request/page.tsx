import { api } from "~/trpc/server";
import { getServerAuthSession } from "~/server/auth";
import CustomLoginText from "~/app/_components/custom-login-text";
import Header from "~/app/_components/header";
import RequestForm from "~/app/_components/request-form";

export default async function RequestPage() {
  const session = await getServerAuthSession();

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <CustomLoginText
          text="Please login to access team requests"
          label="Login"
        />
      </div>
    );
  }

  const user = await api.team.getCurrentUser();
  const teams = await api.team.getAllTeams();
  const userRequest = await api.team.getUserRequest();

  if (user?.team) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="pt-16">
          <Header title="Team Assignment" subtitle="Already Assigned" />
        </div>
        <div className="container mx-auto max-w-2xl p-4">
          <div className="rounded-lg bg-green-800 p-6 text-center">
            <h3 className="mb-2 text-xl font-semibold">
              You&apos;re already assigned!
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
      <div className="pt-16 lg:pt-0">
        <Header title="Team Request" subtitle="Request Team Assignment" />
      </div>
      <div className="container mx-auto max-w-2xl space-y-6 p-4">
        <RequestForm teams={teams} userRequest={userRequest} />

        <div className="rounded-lg bg-gray-800 p-6">
          <h3 className="mb-4 text-xl font-semibold">Available Teams</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {teams?.map((team) => (
              <div
                key={team.id}
                className={`rounded border-l-4 p-4 ${
                  (team._count?.members ?? 0) >= 4
                    ? "border-red-500 bg-red-900"
                    : "border-blue-500 bg-gray-700"
                }`}
              >
                <h4 className="text-lg font-semibold">{team.name}</h4>
                <p
                  className={`text-sm ${
                    (team._count?.members ?? 0) >= 4
                      ? "text-red-300"
                      : "text-gray-400"
                  }`}
                >
                  {team._count?.members ?? 0}/4 members
                  {(team._count?.members ?? 0) >= 4 && " - FULL"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
