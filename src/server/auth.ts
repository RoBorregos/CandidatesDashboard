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
  // events: {
  // signIn: async (event) => {
  //     if (event.user.email) {
  //       const isAdmin = await db.admin.findUnique({
  //         where: {
  //           email: event.user.email,
  //         },
  //       });
  //       if (isAdmin) {
  //         await db.user.update({
  //           where: {
  //             email: event.user.email,
  //           },
  //           data: {
  //             role: Role.ADMIN,
  //           },
  //         });
  //         return;
  //       }
  //       const isJudge = await db.judge.findFirst({
  //         where: {
  //           email: {
  //             equals: event.user.email,
  //             // Warning: If developing with mysql this will cause build to fail
  //             mode: "insensitive",
  //           },
  //         },
  //       });
  //       if (isJudge) {
  //         await db.user.update({
  //           where: {
  //             email: event.user.email,
  //           },
  //           data: {
  //             role: Role.JUDGE,
  //           },
  //         });
  //         return;
  //       }
  //       const isContestant = await db.emailTeam.findFirst({
  //         where: {
  //           email: {
  //             equals: event.user.email,
  //             mode: "insensitive",
  //           },
  //         },
  //       });
  //       if (isContestant) {
  //         const team = await db.team.findUnique({
  //           where: {
  //             name: isContestant.team,
  //           },
  //           select: {
  //             id: true,
  //           },
  //         });
  //         if (!team) {
  //           throw new Error("Team not found");
  //         }
  //         await db.user.update({
  //           where: {
  //             email: event.user.email,
  //           },
  //           data: {
  //             teamId: team.id,
  //             role: Role.CONTESTANT,
  //           },
  //         });
  //         return;
  //       }
  //       await db.user.update({
  //         where: {
  //           email: event.user.email,
  //         },
  //         data: {
  //           role: Role.UNASSIGNED,
  //         },
  //       });
  //     }
  //   },
  // },
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
