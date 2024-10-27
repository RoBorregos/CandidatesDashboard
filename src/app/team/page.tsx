"use client";
import Table from "rbrgs/app/_components/table";
import { Field, Form, Formik } from "formik";
import { api } from "rbrgs/trpc/react";
import { Challenge, User } from "@prisma/client";
import Header from "../_components/header";
import Title from "../_components/title";
import Subtitle from "../_components/subtitle";


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
      col1: challenge.time.toLocaleTimeString(),
      col2: challenge.name,
    }));
  }

  function transformInterviewData(members: User[]): Data[] {
    return members.map((member, key) => ({
      col1: member.interviewTime
        ? member.interviewTime.toLocaleTimeString()
        : "",
      col2: member.name ? member.name : "",
    }));
  }

  return (

    <div className="h-96 bg-black p-10 text-white">
      <div className="pb-20">

        <Header title="Team" subtitle={team?.data?.name || ""} />
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
      ) : (
        <div>
         <Title title="No data found" />
        </div>
      )}
    </div>
  );
}
