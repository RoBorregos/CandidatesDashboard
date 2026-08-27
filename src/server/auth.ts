import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";

import { env } from "rbrgs/env";
import { db } from "rbrgs/server/db";
import { Role, RegistrationStatus } from "@prisma/client";
import { CURRENT_EDITION } from "~/lib/registration";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      teamId: string | null;
      isMentor: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    teamId: string | null;
    isMentor: boolean;
  }
}
async function resolveTeamId(
  email: string,
  registration: { status: RegistrationStatus; teamId: string | null } | null,
) {
  if (
    registration?.status === RegistrationStatus.ACCEPTED &&
    registration.teamId
  ) {
    return registration.teamId;
  }

  const assignment = await db.emailTeam.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!assignment) return null;

  const team = await db.team.findUnique({
    where: { name: assignment.team },
    select: { id: true },
  });
  return team?.id ?? null;
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  events: {

    signIn: async ({ user }) => {
      const email = user.email;
      if (!email) return;

      const current = await db.user.findUnique({
        where: { email },
        select: { id: true, role: true, teamId: true, interviewArea: true },
      });
      if (!current) return;

      const isAdmin = await db.admin.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (isAdmin) {
        if (current.role !== Role.ADMIN) {
          await db.user.update({ where: { email }, data: { role: Role.ADMIN } });
        }
        return;
      }

      const isJudge = await db.judge.findFirst({
        where: {
          // Warning: If developing with mysql this will cause build to fail
          email: { equals: email, mode: "insensitive" },
        },
      });
      if (isJudge) {
        if (current.role !== Role.JUDGE) {
          await db.user.update({ where: { email }, data: { role: Role.JUDGE } });
        }
        return;
      }

      // What this person filled in the registration form, if anything.
      const member = await db.registrationMember.findFirst({
        where: {
          edition: CURRENT_EDITION,
          email: { equals: email, mode: "insensitive" },
        },
        select: {
          id: true,
          userId: true,
          interviewArea: true,
          registration: { select: { status: true, teamId: true } },
        },
      });

      // Tie the form submission to the account now that it exists.
      if (member && member.userId !== current.id) {
        await db.registrationMember.update({
          where: { id: member.id },
          data: { userId: current.id },
        });
      }

      // The area answered in the form seeds interview scheduling.
      const interviewArea =
        !current.interviewArea && member?.interviewArea
          ? member.interviewArea
          : undefined;

      const teamId = current.teamId
        ? null
        : await resolveTeamId(email, member?.registration ?? null);

      if (!teamId && !interviewArea) return;

      await db.user.update({
        where: { email },
        data: {
          ...(interviewArea ? { interviewArea } : {}),
          ...(teamId
            ? {
                teamId,
                role:
                  current.role === Role.UNASSIGNED
                    ? Role.CONTESTANT
                    : current.role,
              }
            : {}),
        },
      });
    },
  },
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        role: user.role,
        id: user.id,
        teamId: user.teamId,
        isMentor: user.isMentor,
      },
    }),
  },
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "database",
  },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
