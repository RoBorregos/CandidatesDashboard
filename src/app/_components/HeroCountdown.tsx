"use client";

import { useEffect, useState } from "react";
import { cn } from "r/lib/utils";

interface HeroCountdownProps {
  /** ISO timestamp the countdown runs to. */
  targetDate: string;
  className?: string;
}

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Time left until `target`, clamped at zero once it has passed. */
function getTimeLeft(target: number, now: number): TimeLeft {
  const difference = Math.max(0, target - now);
  return {
    days: Math.floor(difference / MS_PER_DAY),
    hours: Math.floor((difference % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((difference % MS_PER_HOUR) / MS_PER_MINUTE),
    seconds: Math.floor((difference % MS_PER_MINUTE) / MS_PER_SECOND),
  };
}

/**
 * Days / hours / minutes / seconds until competition day, sized for the hero
 * section. Stops at 00 once the target is reached.
 */
export function HeroCountdown({ targetDate, className }: HeroCountdownProps) {
  // Null until mounted: the server's clock would never match the browser's,
  // so the numbers are only rendered on the client.
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const tick = () => setTimeLeft(getTimeLeft(target, Date.now()));

    tick();
    const interval = setInterval(tick, MS_PER_SECOND);
    return () => clearInterval(interval);
  }, [targetDate]);

  const units: { label: string; value: number | undefined }[] = [
    { label: "Days", value: timeLeft?.days },
    { label: "Hours", value: timeLeft?.hours },
    { label: "Minutes", value: timeLeft?.minutes },
    { label: "Seconds", value: timeLeft?.seconds },
  ];

  return (
    <div
      className={cn(
        "flex flex-row items-start justify-center gap-x-[5vw] font-archivo text-white lg:gap-x-[3vw]",
        className,
      )}
      aria-label="Countdown to competition day"
    >
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="font-digital text-[12vw] leading-none text-slate-300 lg:text-[5vw]">
            {value === undefined ? "--" : String(value).padStart(2, "0")}
          </span>
          <span className="mt-[1vw] text-[3vw] uppercase tracking-widest text-neutral-300 lg:mt-[0.5vw] lg:text-[1vw]">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
