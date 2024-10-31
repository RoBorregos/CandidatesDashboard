import { Challenge, User } from "@prisma/client";
import Table from "rbrgs/app/_components/table";
import { api } from "rbrgs/trpc/server";
import Header from "../_components/header";
import Title from "../_components/title";
import { signIn } from "next-auth/react";
import Footer from "../_components/footer";
import Spinner from "../_components/spinner";
import { getServerAuthSession } from "rbrgs/server/auth";
import Input from "../_components/input";
import LoginText from "../_components/login-text";
import CustomLoginText from "../_components/custom-login-text";
import SwitchButton from "../_components/team/switchButton";

interface Data {
  col1: string;
  col2: string;
}

function onClick() {
  signIn("google");
}

export default async function TeamPage({ params }: { params: { teampage: string } }) {
  const session = await getServerAuthSession();



  function transformChallengeData(challenges: Challenge[]): Data[] {
    return challenges.map((challenge, key) => ({
      col1: challenge.time.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      col2: challenge.name,
    }));
  }

  function transformInterviewData(members: User[]): Data[] {
    return members.map((member, key) => ({
      col1: member.interviewTime
        ? member.interviewTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        : "",
      col2: member.name ? member.name : "",
    }));
  }

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center">
        <CustomLoginText text="Please login to view your team information" label={"Login"} />
      </div>
    );
  }
  const team = await api.team.getTeam();
  const rounds = team?.rounds;

  return (
    <div className="mt-[4rem] h-96 bg-black text-sm text-white md:text-base">
      <div className="md:pb-20">
        <Header title="Team" subtitle={team?.name ?? ""} />
      </div>



      <div className="px-20 pb-20 pt-10">
        <h1 className="text-xl font-semibold">
          <span className="font-normal text-gray-200 pr-1">&#60; </span> Welcome <span className="font-jersey_25 text-blue-700 text-3xl">{session.user.name}</span> ! <span className="font-normal pl-1 text-gray-200">/&#62;</span>
        </h1>
        <div>
          Here you will find the schedules for your rounds and interviews.
          <br />Please make sure to be on time.
          <br />Don&apos;t forget to add the link to your documents down below.
          <br />A link to a google drive folder is fine, but remember we can see the last time it was updated/created. (Ensure permissions are correct for us to access the docs)
        </div>

      </div>

      {/* <SwitchButton variant="DOCS" onClick={onClick} /> */}

      {team?.name ? (



        <div className="pb-40">
          {/* <Title title="Rounds" /> */}
          <h1 className="mb-5 text-center text-4xl ">Rounds</h1>
          {rounds?.map((round, key) => (
            <Table
              key={key}
              data={transformChallengeData(round.challenges)}
              title={`Round ${round.number}`}
            />
          ))}

          {/* <Title title="Interviews" /> */}
          <h1 className="mb-5 text-center text-4xl mt-16">Interviews</h1>

          <Table data={transformInterviewData(team.members)} title={""} />

          {/* <Title title="Documents" /> */}
          <h1 className="mb-5 text-center text-4xl mt-16">Documents</h1>
          <Input teamId={team.id} prevLink={team.link ?? ""} />
        </div>
      ) : !team ? (
        <div>
          <div className="flex h-[30rem] items-center justify-center">
            <Spinner size="lg" />
          </div>
        </div>
      ) : (
        <div className="flex h-[30rem] items-center justify-center">
          <Title title="No data found" />
        </div>

      )}

      <Footer />
    </div>
  );
}
