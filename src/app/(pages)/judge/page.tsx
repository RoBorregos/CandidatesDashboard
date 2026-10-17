"use client";

import { FormChallengeA } from "../forms/FormChallengeA";

import Header from "rbrgs/app/_components/header";
import { useEffect, useState } from "react";
import { FormChallengeB } from "../forms/FormChallengeB";
import { FormChallengeC } from "../forms/FormChallengeC";
import { FormMaze } from "../forms/FormMaze";
import { FormLevels } from "../forms/FormLevels";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import {
  parseTrack,
  TRACK_NAMES,
  TRACKS,
  type TrackKind,
} from "~/lib/competition-schedule";
import { cn } from "~/lib/utils";

/*
 * 2026 tracks. The 2025 forms (challengeA/B/C) and their endpoints still
 * exist; add them here with their own entry to judge with the old rubric.
 */
const CHALLENGES: { value: string; track: TrackKind }[] = [
  { value: "maze", track: "A" },
  { value: "levels", track: "B" },
];

/** Remembers the judge's track and lane across reloads, on this device only. */
const STORAGE_KEY = "judge:lane";

export default function JudgePage() {
  const [selected, setSelected] = useState("Sin seleccionar");
  const [lane, setLane] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) ?? "null",
      ) as { selected?: string; lane?: string } | null;
      if (saved?.selected && saved.lane) {
        setSelected(saved.selected);
        setLane(saved.lane);
      }
    } catch {
      // Storage blocked or garbage: start from the picker.
    }
  }, []);

  const choose = (value: string, nextLane: string) => {
    setSelected(value);
    setLane(nextLane);
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ selected: value, lane: nextLane }),
      );
    } catch {
      // Not remembered, but the page still works.
    }
  };

  const session = useSession();

  if (
    session.data?.user?.role !== Role.ADMIN &&
    session.data?.user?.role !== Role.JUDGE
  ) {
    return (
      <main className="mt-[4rem] h-96 bg-black text-sm text-white md:text-base">
        <div className="md:pb-20">
          <Header title="Judge" subtitle="" />
        </div>
        <div className="p-2">
          <h1 className="mb-5 text-center text-4xl">
            You don&apos;t have permission to access this page.
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="mt-[4rem] min-h-screen bg-black pb-20 text-sm text-white md:text-base">
      <div className="md:pb-12">
        <Header title="Judge" subtitle="" />
      </div>
      <div className="mx-auto max-w-2xl space-y-3 px-4">
        <h1 className="text-center text-2xl">Your lane</h1>
        <div className="grid grid-cols-2 gap-3">
          {CHALLENGES.map(({ value, track }) => (
            <div key={value} className="space-y-2">
              <p className="text-center text-xs uppercase tracking-widest text-neutral-400">
                Pista {track} · {TRACK_NAMES[track]}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TRACKS[track].map((name) => {
                  const laneName = parseTrack(name)!.lane;
                  const active = selected === value && lane === laneName;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => choose(value, laneName)}
                      className={cn(
                        "h-14 rounded-lg border-2 font-digital text-3xl transition active:scale-[0.97]",
                        active
                          ? "border-roboblue bg-roboblue/30"
                          : "border-neutral-700 bg-neutral-900 hover:border-neutral-500",
                      )}
                    >
                      {laneName}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4">
        <ShowForm selection={selected} lane={lane} />
      </div>
    </main>
  );
}

const ShowForm = ({ selection, lane }: { selection: string; lane: string }) => {
  // Keyed on the lane so switching lanes starts from a clean form.
  switch (selection) {
    case "maze":
      return (
        <ChallengeWrapper>
          <FormMaze key={lane} lane={lane} />
        </ChallengeWrapper>
      );
    case "levels":
      return (
        <ChallengeWrapper>
          <FormLevels key={lane} lane={lane} />
        </ChallengeWrapper>
      );
    case "challengeA":
      return (
        <ChallengeWrapper>
          <FormChallengeA />
        </ChallengeWrapper>
      );
    case "challengeB":
      return (
        <ChallengeWrapper>
          <FormChallengeB />
        </ChallengeWrapper>
      );
    case "challengeC":
      return (
        <ChallengeWrapper>
          <FormChallengeC />
        </ChallengeWrapper>
      );
    default:
      return <></>;
  }
};

const ChallengeWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="mx-auto my-8 max-w-2xl rounded border border-neutral-700 p-3 shadow-lg">
      {children}
    </div>
  );
};
