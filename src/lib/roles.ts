import { Role } from "@prisma/client";

/**
 * Roles that describe who someone is, independent of any team.
 *
 * Joining or leaving a team only ever flips a user between CONTESTANT and
 * UNASSIGNED — it must never overwrite a standing role. Keeping the list in
 * one place stops call sites from drifting apart as roles are added.
 *
 * Mentoring is deliberately absent: it lives on `User.isMentor`, so it already
 * survives team changes without needing protection here.
 */
const TEAM_INDEPENDENT_ROLES: readonly Role[] = [Role.ADMIN, Role.JUDGE];

export function roleAfterJoiningTeam(role: Role | undefined | null): Role {
  return role && TEAM_INDEPENDENT_ROLES.includes(role) ? role : Role.CONTESTANT;
}

export function roleAfterLeavingTeam(role: Role | undefined | null): Role {
  return role && TEAM_INDEPENDENT_ROLES.includes(role) ? role : Role.UNASSIGNED;
}
