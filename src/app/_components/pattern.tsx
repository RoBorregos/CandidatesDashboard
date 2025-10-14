"use client";
import { useState } from "react";
import Image from "next/image";
import { Pattern } from "@prisma/client";

export const patternData: Array<{
    id: Pattern;
    src: string;
    alt: string;
    points: number;
}> = [
    { id: Pattern.A3, src: "/images/challengeB/A3.png", alt: "Pattern A3", points: 2 },
    { id: Pattern.A4, src: "/images/challengeB/A4.png", alt: "Pattern A4", points: 3 },
    { id: Pattern.B1, src: "/images/challengeB/B1.png", alt: "Pattern B1", points: 6 },
    { id: Pattern.B2, src: "/images/challengeB/B2.png", alt: "Pattern B2", points: 9 },
    { id: Pattern.B3, src: "/images/challengeB/B3.png", alt: "Pattern B3", points: 14 },
    { id: Pattern.C1, src: "/images/challengeB/C1.png", alt: "Pattern C1", points: 6 },
    { id: Pattern.C2, src: "/images/challengeB/C2.png", alt: "Pattern C2", points: 8 },
    { id: Pattern.C3, src: "/images/challengeB/C3.png", alt: "Pattern C3", points: 15 },
    { id: Pattern.D1, src: "/images/challengeB/D1.png", alt: "Pattern D1", points: 7 },
    { id: Pattern.D2, src: "/images/challengeB/D2.png", alt: "Pattern D2", points: 12 },
    { id: Pattern.D3, src: "/images/challengeB/D3.png", alt: "Pattern D3", points: 18 },
    { id: Pattern.D4, src: "/images/challengeB/D4.png", alt: "Pattern D4", points: 20 },
    { id: Pattern.E1, src: "/images/challengeB/E1.png", alt: "Pattern E1", points: 7 },
    { id: Pattern.E2, src: "/images/challengeB/E2.png", alt: "Pattern E2", points: 12 },
    { id: Pattern.E3, src: "/images/challengeB/E3.png", alt: "Pattern E3", points: 18 },
    { id: Pattern.E4, src: "/images/challengeB/E4.png", alt: "Pattern E4", points: 25 },
    { id: Pattern.FINISH, src: "/images/challengeB/Finish.png", alt: "Pattern Finish", points: 20 },
    { id: Pattern.BONUS, src: "/images/challengeB/Bonus.png", alt: "Pattern Bonus", points: 50 },
];

type TrackDataField = {
  trackPoints: number;
  patternsPassed: Pattern[];
};

export default function PatternB({
  id,
  patterns,
  trackPoints,
  onChange,
  increment,
  src,
}: {
  id: Pattern;
  patterns: Pattern[];
  trackPoints: number;
  onChange: (field: TrackDataField) => void;
  increment: number;
  src: string;
}) {
  const [passed, setPassed] = useState(0);

  const onClickPlus = (patterns: Pattern[]) => {
    onChange({
      trackPoints: trackPoints + increment,
      patternsPassed: [...patterns, id],
    });
    setPassed(passed + 1);
  };

  const onClickMinus = (patterns: Pattern[]) => {
    onChange({
      trackPoints: trackPoints - increment,
      patternsPassed: patterns.filter((p) => p !== id),
    });
    setPassed(passed - 1);
  };

  function isDisabled(id: Pattern) {
    const finishPatterns: Pattern[] = [Pattern.BONUS, Pattern.FINISH];
    const checkpointPatterns: Pattern[] = [
      Pattern.E1,
      Pattern.E2,
      Pattern.E3,
      Pattern.E4,
    ];
    return (
      (patterns.some((p) => checkpointPatterns.includes(p)) &&
        checkpointPatterns.includes(id)) ||
      (patterns.some((p) => finishPatterns.includes(p)) &&
        finishPatterns.includes(id))
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6">
      <div className="relative flex aspect-square w-full max-w-[200px] items-center justify-center bg-white">
        <Image
          src={src}
          alt="pattern"
          fill
          className="rounded-lg object-contain"
        />
      </div>
      <div className="relative flex h-full w-full py-2">
        <div className="flex h-6 w-6 items-center justify-center self-start rounded-full border-2 border-white text-white">
          {passed}
        </div>
        <div className="absolute left-1/2 flex w-1/4 -translate-x-1/2 transform items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onClickPlus(patterns)}
            disabled={isDisabled(id)}
            className={`rounded bg-slate-950 px-3 py-1 text-white ${isDisabled(id) ? "cursor-not-allowed opacity-50" : ""} `}
            aria-label="increment"
            title="Increment"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => onClickMinus(patterns)}
            disabled={passed <= 0}
            className={`rounded bg-slate-950 px-3 py-1 text-white ${passed <= 0 ? "cursor-not-allowed opacity-50" : ""} `}
            aria-label="decrement"
            title="Decrement"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}

export function PatternGrid({
  patterns,
  trackPoints,
  onChange,
}: {
  patterns: Array<Pattern>;
  trackPoints: number;
  onChange: (field: TrackDataField) => void;
}) {
  return (
    <div>
      <div className="grid w-full grid-cols-3 place-items-center gap-2 2xl:grid-cols-4">
        {patternData.map((pattern) => (
          <PatternB
            key={pattern.id}
            id={pattern.id}
            patterns={patterns}
            trackPoints={trackPoints}
            onChange={onChange}
            increment={pattern.points}
            src={pattern.src}
          />
        ))}
      </div>
      <div className="pt-6">Total: {trackPoints} points</div>
    </div>
  );
}
