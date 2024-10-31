"use client";

import { api } from "~/trpc/react";

export function useScoreboardData() {
  return api.scoreboard.getScoreboard.useQuery();
}
