import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/*
 * Ids of the teams that count as beginner for an edition.
 *
 * Teams reach the database two ways and neither leaves a single field to
 * filter on:
 *
 *  - acceptRegistration creates the team named in a registration and sets
 *    Registration.teamId, so the back-relation is there.
 *  - the automatic team making (autoAssignUsers) builds teams out of solo
 *    candidates and only sets User.teamId — no registration points at those.
 *
 */
export async function beginnerTeamIds(
  db: Db,
  edition: number,
): Promise<string[]> {
  const registrations = await db.registration.findMany({
    where: { edition, track: "BEGINNER" },
    select: { teamId: true, members: { select: { email: true } } },
  });

  const teamIds = new Set(
    registrations
      .map((registration) => registration.teamId)
      .filter((teamId): teamId is string => Boolean(teamId)),
  );

  const emails = registrations.flatMap((registration) =>
    registration.members.map((member) => member.email),
  );

  if (emails.length > 0) {
    const members = await db.user.findMany({
      where: { email: { in: emails }, teamId: { not: null } },
      select: { teamId: true },
    });

    for (const member of members) {
      if (member.teamId) teamIds.add(member.teamId);
    }
  }

  return [...teamIds];
}
