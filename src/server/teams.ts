import type { Prisma } from "@prisma/client";

/*
 * Beginner teams reach the database two different ways and only one of them
 * fills Team.registrations:
 *
 *  - acceptRegistration creates the team named in a registration and sets
 *    Registration.teamId, so the back-relation is there.
 *  - the automatic team making (autoAssignUsers) builds teams out of solo
 *    candidates and only sets User.teamId — those teams have no registration
 *    pointing at them at all.
 *
 * Matching on Team.registrations alone therefore misses every auto-built team.
 * Fall back to the members' own registrations for those.
 */
export function beginnerTeamWhere(edition: number): Prisma.TeamWhereInput {
  return {
    OR: [
      { registrations: { some: { track: "BEGINNER", edition } } },
      {
        members: {
          some: {
            registrationMembers: {
              some: { edition, registration: { track: "BEGINNER" } },
            },
          },
        },
      },
    ],
  };
}
