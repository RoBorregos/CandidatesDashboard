"use client";

import { SessionProvider } from "next-auth/react";

// The schedule page reads the session to offer the "My team" view.
export default function ScheduleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SessionProvider>{children}</SessionProvider>;
}
