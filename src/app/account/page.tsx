import { getServerAuthSession } from "rbrgs/server/auth";
import { signOut } from "next-auth/react";
import LoginText from "../_components/login-text";
import { Role } from "@prisma/client";
import { api } from "rbrgs/trpc/server";
import { Separator } from "r/components/ui/separator";

export default async function AccountPage() {
  const session = await getServerAuthSession();
  if (!session) {
    return (
      <div className="mt-[4rem] rounded-md bg-gradient-to-r from-blue-rbrgs to-black p-10 text-white">
        <LoginText />
        <p>You need to log in to access this page.</p>
      </div>
    );
  }

  const teamData = await api.team.getTeam();
  
  return (
    <div className="mt-[4rem] h-max bg-black p-10 font-mono text-white">
      <h1 className="font-anton text-[3vw]">Account</h1>

      <div className="m-4 rounded-md bg-gradient-to-r from-blue-rbrgs to-black p-10 text-white">
        <p>
          You are logged in as {session.user.email} - {session.user.name}
        </p>
        {session.user.role === Role.CONTESTANT && (
          <div>
            <p>
              You can view the scoreboard, check your rounds&apos; times and
              submit all of your teams documents.
            </p>
            <p className="font-bold">Give it your best!</p>
          </div>
        )}

        {session.user.role === Role.JUDGE && (
          <div>
            You can view the scoreboard, check the rounds&apos; times and submit
            your scores for each team.
            <p className="font-bold">Good luck!</p>
          </div>
        )}

        {session.user.role === Role.UNASSIGNED && (
          <div>
            <p>
              Hmm... It seems your email is not associated with any team or
              role. Please contact your mentors or website administrators if you
              think this is a mistake. Otherwise, feel free to browse the
              website!
            </p>
            <p className="font-bold">Give it your best!</p>
          </div>
        )}

        {session.user.role === Role.ADMIN && <p>ADMIN</p>}
      </div>

      {session.user.role === Role.CONTESTANT && teamData?.id && (
        <>
          <h1 className="font-anton text-[3vw]">Team {teamData?.name}</h1>

          <div className="m-4 rounded-md bg-gradient-to-r from-blue-rbrgs to-black p-10 font-mono text-white">
            {teamData?.members.map((member, key) => (
              <div key={key}>
                <p className="font-mono">{member.name}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
