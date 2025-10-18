"use client";
import { Challenge } from "@prisma/client";
import Table from "rbrgs/app/_components/table";
import Input from "../input";
import Spinner from "../spinner";
import Title from "../title";
import SwitchButton from "./switchButton";
import { useCallback, useState } from "react";
import { TeamType } from "rbrgs/server/api/routers/team";
import Results from "./results";
import interviewData from "./interview.json";
import Upload from "./upload";

interface Data {
  col1: string;
  col2: string;
}

function transformChallengeData(challenges: Challenge[]): Data[] {
  return challenges.map((challenge) => ({
    col1: challenge.time.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    col2: challenge.name,
  }));
}

type TeamInfoProps = {
  team: TeamType;
  userInterviewTime: Date | null;
};

const TeamInfo = ({ team, userInterviewTime }: TeamInfoProps) => {
  const [variant, setSelected] = useState<"INFO" | "RESULTS">("INFO");
  const toggleVariant = useCallback(() => {
    setSelected(variant === "INFO" ? "RESULTS" : "INFO");
  }, [variant]);

  return (
    <div>
      <SwitchButton variant={variant} onClick={toggleVariant} />
      {team?.name ? (
        <div className="pb-40">
          {variant === "INFO" ? (
            <Schedules team={team} userInterviewTime={userInterviewTime} />
          ) : (
            <Results team={team} />
          )}

          {/* <h1 className="mb-5 mt-16 text-center font-archivo text-4xl">
            Documents
          </h1>
          <Upload
            title="Binnacle"
            endpoint="binnacleUploader"
            currentUrl={team.binnacleLink}
            isImagePreview={false}
          />

          <h1 className="mb-5 mt-16 text-center font-archivo text-4xl">
            Robot Image
          </h1>
          <Upload
            title="Robot Image"
            endpoint="robotImageUploader"
            currentUrl={team.robotImageLink ?? null}
            isImagePreview={true}
          />

          <Input
            teamId={team.id}
            prevLink={team.driveLink ?? ""}
            prevGithub={team.githubLink ?? ""}
          /> */}
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
    </div>
  );
};

const Schedules = ({
  team,
  userInterviewTime,
}: {
  team: TeamType;
  userInterviewTime: Date | null;
}) => {
  const rounds = team?.rounds;
  const interviewsTimes = interviewData.times;

  const interviewTimeText = userInterviewTime
    ? new Date(userInterviewTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : (interviewsTimes[team?.name as keyof typeof interviewsTimes] ??
      "No interview time available, contact us");

  return (
    <div>
      <h1 className="m-5 text-center font-archivo text-4xl">Rounds</h1>
      {rounds?.map((round, key) => (
        <Table
          key={key}
          data={transformChallengeData(round.challenges)}
          title={`Round ${round.number}`}
        />
      ))}

      <h1 className="mb-5 mt-16 text-center font-archivo text-4xl">
        Interview time
      </h1>
      <div className="text-center font-archivo text-3xl">
        {interviewTimeText}
      </div>
    </div>
  );
};

export default TeamInfo;
