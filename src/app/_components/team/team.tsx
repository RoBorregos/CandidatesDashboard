"use client";
import { Challenge, Team, User } from "@prisma/client";
import Table from "rbrgs/app/_components/table";
import Input from "../input";
import Spinner from "../spinner";
import Title from "../title";
import SwitchButton from "./switchButton";
import { useCallback, useState } from "react";
import { TeamType } from "rbrgs/server/api/routers/team";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../shadcn/ui/select";

interface Round {
    number: number;
    challenges: {
        name: string;
        id: string;
        time: Date;
        roundId: string;
    }[];
}

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

            {/* <Title title="Interviews" /> */}
            <h1 className="mb-5 text-center text-4xl mt-16">Interviews</h1>

            <Table data={team?.members ? transformInterviewData(team.members) : []} title={""} />
        </div>
    )
}

const Results = ({ team }: { team: TeamType }) => {
    const challengeA = team?.challengeA;
    const challengeB = team?.challengeB;
    const challengeC = team?.challengeC;
    const [selected, setSelected] = useState("Sin seleccionar");
    

    return (
        <div>
            <h1 className="mb-5 text-center text-4xl">Results</h1>
            <div className="mx-auto lg:w-1/2">
                <Select
                    onValueChange={(value) => {
                        setSelected(value);
                    }}
                    value={selected}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona una ronda" />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="1">Ronda 1</SelectItem>
                        <SelectItem value="2">Ronda 2</SelectItem>
                        <SelectItem value="3">Ronda 3</SelectItem>
                    </SelectContent>
                </Select>

                {selected != "Sin seleccionar" && (
                    <RoundResults team={team} selection={selected} />
                )}


            </div>
        </div>
    )
}

const RoundResults = ({ team, selection }: { team: TeamType, selection: string }) => {

    const challengesA = team?.challengeA;
    const challengesB = team?.challengeB;
    const challengesC = team?.challengeC;

    return (
        <div className="pt-10">
            <div>
                <div className="pb-10">

                    <h1 className="font-anton text-lg pb-2">Challenge A - Pelota</h1>
                    {challengesA?.filter((challenge) => challenge.roundId === selection).map((challenge, key) => (
                        <div key={key} className="px-5">
                            Ball contact: {challenge.ballContact ? "Yes" : "No"}
                            <br />Ball saved: {challenge.ballSaved ? "Yes" : "No"}
                            <br />Finish track: {challenge.finshTrack ? "Yes" : "No"}
                            <br />Finish track (No crossing line): {challenge.finishTrackNoCrossingLine ? "Yes" : "No"}
                            <br />Bonus: {challenge.obtainedBonus ? "Yes" : "No"}
                            <br />Time: {challenge.roundTimeSeconds} seconds
                            <br />Lack of progress: {challenge.lackOfProgress ? "Yes" : "No"}
                            <hr className="py-1" />
                            Points: {challenge.points}
                        </div>
                    ))}
                </div>


                <div className="pb-10">
                    <h1 className="font-anton text-lg pb-2">Challenge B - Seguidor de línea</h1>
                    {challengesB?.filter((challenge) => challenge.roundId === selection).map((challenge, key) => (
                        <div key={key} className="px-5">
                            Track Points: {challenge.trackPoints}
                            <br />Time: {challenge.roundTimeSeconds} seconds
                            <br />Lack of progress: {challenge.lackOfProgress ? "Yes" : "No"}
                            <hr className="py-1" />
                            Points: {challenge.points}
                        </div>
                    ))}
                </div>


                <h1 className="font-anton text-lg pb-2">Challenge C - Laberinto</h1>
                {challengesC?.filter((challenge) => challenge.roundId === selection).map((challenge, key) => (
                    <div key={key} className="px-5">
                        Number of detected colors: {challenge.detectedColors}
                        <br />Passed ramp: {challenge.passedRamp ? "Yes" : "No"}
                        <br />Passed ramp (No lack of progress): {challenge.crossedRampWithoutLOP ? "Yes" : "No"}
                        <br />Passed ramp (No touching walls): {challenge.crossedRampWithoutTouching ? "Yes" : "No"}
                        <br />Balanced in ramp: {challenge.balancedRamp ? "Yes" : "No"}
                        <br />Bonus: {challenge.obtainedBonus ? "Yes" : "No"}
                        <br />Time: {challenge.roundTimeSeconds} seconds
                        <br />Lack of progress: {challenge.lackOfProgress ? "Yes" : "No"}
                        <hr className="py-1" />
                        Points: {challenge.points}
                    </div>
                ))}
            </div>
        </div>
    )
}



export default TeamInfo;