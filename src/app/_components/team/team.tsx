"use client";
import { Challenge, User } from "@prisma/client";
import Table from "rbrgs/app/_components/table";
import Input from "../input";
import Spinner from "../spinner";
import Title from "../title";
import SwitchButton from "./switchButton";
import { useCallback, useState } from "react";
import { TeamType } from "rbrgs/server/api/routers/team";
import Results from "./results";

interface Data {
    col1: string;
    col2: string;
}

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

const TeamInfo = ({ team }: { team: TeamType }) => {

    const [variant, setSelected] = useState("INFO");
    const toggleVariant = useCallback(() => {
        setSelected(variant === "INFO" ? "RESULTS" : "INFO");
    }, [variant]);

    return (
        <div>
            <SwitchButton variant={variant} onClick={toggleVariant} />
            {team?.name ? (

                <div className="pb-40">

                    {variant === "INFO" ? (
                        <Schedules team={team} />
                    ) : (
                        <Results team={team} />
                    )}


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
        </div>
    )
}

const Schedules = ({ team }: { team: TeamType }) => {
    const rounds = team?.rounds;
    return (
        <div>
            <h1 className="mb-5 text-center text-4xl ">Rounds</h1>
            {rounds?.map((round, key) => (
                <Table
                    key={key}
                    data={transformChallengeData(round.challenges)}
                    title={`Round ${round.number}`}
                />
            ))}

            <h1 className="mb-5 text-center text-4xl mt-16">Interviews</h1>

            <Table data={team?.members ? transformInterviewData(team.members) : []} title={""} />
        </div>
    )
}



export default TeamInfo;