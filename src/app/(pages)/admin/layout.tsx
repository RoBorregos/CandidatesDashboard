import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "rbrgs/server/auth";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerAuthSession();

  if (session?.user.role !== Role.ADMIN) {
    redirect("/");
  }
  return children;
}
