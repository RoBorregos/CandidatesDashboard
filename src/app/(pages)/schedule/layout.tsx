"use client";

import { SessionProvider } from "next-auth/react";

// The schedule page reads the session to highlight the user's own team.
export default function ScheduleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SessionProvider>{children}</SessionProvider>;
}
