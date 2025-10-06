import { api } from "rbrgs/trpc/server";
import Header from "../../_components/header";
import Footer from "../../_components/footer";
import { getServerAuthSession } from "rbrgs/server/auth";
import CustomLoginText from "../../_components/custom-login-text";
import TeamInfo from "../../_components/team/team";
import { redirect } from "next/navigation";

export default async function TeamPage({
  params,
}: {
  params: { teampage: string };
}) {
  const session = await getServerAuthSession();

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <CustomLoginText
          text="Please login to view your team information"
          label={"Login"}
        />
      </div>
    );
  }
  const team = await api.team.getTeam();
  if (!team) {
    redirect("/request");
  }

  const rounds = team?.rounds;

  return (
    <div className="mt-[4rem] h-96 bg-black text-sm text-white md:text-base">
      <div className="md:pb-20">
        <Header title="Team" subtitle={team?.name ?? ""} />
      </div>

      <div className="px-20 pb-20 pt-10">
        <h1 className="text-xl font-semibold">
          <span className="pr-1 font-normal text-gray-200">&#60; </span> Welcome{" "}
          <span className="font-jersey_25 text-3xl text-blue-700">
            {session.user.name}
          </span>{" "}
          ! <span className="pl-1 font-normal text-gray-200">/&#62;</span>
        </h1>
        <div>
          Here you will find the schedules for your rounds and interviews as
          well as results for each round.
          <br />
          Please make sure to be on time for rounds and interviews.
          <br />
          Don&apos;t forget to add the link to your documents down below.
          <br />A link to a google drive folder is fine, but remember we can see
          the last time it was updated/created. (Ensure permissions are correct
          for us to access the docs)
        </div>
      </div>

      {team && <TeamInfo team={team} />}

      <Footer />
    </div>
  );
}
