import Header from "~/app/_components/header";
import Footer from "~/app/_components/footer";
import CustomLoginText from "~/app/_components/custom-login-text";
import WeeklyTracking from "~/app/_components/mentor/WeeklyTracking";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function MentorTeamWeekPage({
  params,
}: {
  params: { teamId: string };
}) {
  const session = await getServerAuthSession();

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <CustomLoginText
          text="Please login to view your mentor dashboard"
          label={"Login"}
        />
      </div>
    );
  }

  // The week the staff is on; mentors can still page back to earlier ones.
  const currentWeek = await api.mentor.getCurrentWeek();

  return (
    <div className="mt-16 min-h-screen bg-black text-sm text-white md:text-base">
      <div className="md:pb-8">
        <Header title="Seguimiento semanal" subtitle={session.user.name ?? ""} />
      </div>

      <main className="space-y-6 px-4 pb-20 pt-6 md:px-20">
        <WeeklyTracking teamId={params.teamId} initialWeek={currentWeek} />
      </main>

      <Footer />
    </div>
  );
}
