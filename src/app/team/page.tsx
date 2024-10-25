"use client";
import Table from "rbrgs/app/_components/table";
import { Field, Form, Formik } from "formik";
import { api } from "rbrgs/trpc/react";
import { Challenge, User } from "@prisma/client";

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
    <div className="h-max bg-black p-10 text-white">
      {team.data?.name ? (
        <div>
          <h1>
            {" "}
            Team Page {team.data?.name} {params.teampage}
          </h1>

          {rounds?.map((round, key) => (
            <Table
              key={key}
              data={transformChallengeData(round.challenges)}
              title={`Round ${round.number}`}
            />
          ))}

          <h1> Interviews </h1>

          <Table data={transformInterviewData(team.data.members)} title={""} />
        </div>
      ) : (
        <div>
          <h1>Team not found</h1>
        </div>
      )}
    </div>
  );
}
