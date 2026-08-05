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
import { Role } from "@prisma/client";

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
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    teamId: string | null;
  }
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
        select: { role: true, teamId: true },
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

      // Already on a team: nothing to resolve.
      if (current.teamId) return;

      const assignment = await db.emailTeam.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (!assignment) return;

      const team = await db.team.findUnique({
        where: { name: assignment.team },
        select: { id: true },
      });
      // The team may not exist yet if the registration has not been accepted.
      if (!team) return;

      await db.user.update({
        where: { email },
        data: {
          teamId: team.id,
          role:
            current.role === Role.UNASSIGNED ? Role.CONTESTANT : current.role,
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
