"use client";
import { Challenge, User } from "@prisma/client";
import Table from "rbrgs/app/_components/table";
import { api } from "rbrgs/trpc/react";
import Header from "../_components/header";
import Title from "../_components/title";
import { signIn } from "next-auth/react";
import Footer from "../_components/footer";
import Spinner from "../_components/spinner";

interface Data {
  col1: string;
  col2: string;
}

export default function TeamPage({ params }: { params: { teampage: string } }) {
  const team = api.team.getTeam.useQuery();
  console.log(team.data);
  const rounds = team.data?.rounds;
  console.log("ROUNDS: ", rounds);

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

  return (
    <div className="mt-[4rem] h-96 bg-black text-sm text-white md:text-base">
      <div className="md:pb-20">
        <Header title="Team" subtitle={team?.data?.name ?? ""} />
      </div>

      {team.data?.name ? (
        <div className="pb-40">
          <Title title="Rounds" />

          {rounds?.map((round, key) => (
            <Table
              key={key}
              data={transformChallengeData(round.challenges)}
              title={`Round ${round.number}`}
            />
          ))}

          <Title title="Interviews" />

          <Table data={transformInterviewData(team.data.members)} title={""} />
        </div>
      ) : team.isLoading ? (
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
