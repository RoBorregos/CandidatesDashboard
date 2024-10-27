"use client";

import { useRouter } from "next/navigation";

export default function NavButtons() {
  const router = useRouter();
  return (
    <div className="flex w-full items-center justify-evenly text-white">
      <p
        className="cursor-pointer"
        onClick={() => {
          router.push("/");
        }}
      >
        Scoreboard
      </p>
      <p className="cursor-pointer">Dashboard</p>
      <p className="cursor-pointer">Documents</p>
    </div>
  );
}
