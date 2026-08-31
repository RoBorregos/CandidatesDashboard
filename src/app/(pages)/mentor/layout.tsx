import { redirect } from "next/navigation";
import { getServerAuthSession } from "rbrgs/server/auth";

export default async function MentorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerAuthSession();

  if (!session?.user.isMentor) {
    redirect("/");
  }
  return children;
}
