import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { z } from "zod";
import { db } from "rbrgs/server/db";
import { CURRENT_EDITION } from "~/lib/registration";
import { roleAfterJoiningTeam, roleAfterLeavingTeam } from "~/lib/roles";
import { InterviewArea, Role } from "@prisma/client";

const MAX_TEAM_SIZE = 4;

type UserStub = {
  id: string;
  name: string | null;
  email: string | null;
  interviewArea: InterviewArea | null;
  role: Role;
};

type TeamStub = {
  id: string;
  name: string;
  members: UserStub[];
  count: number;
};

type AssignmentStep =
  | { kind: "fill"; teamId: string; teamName: string; user: UserStub; afterCount: number }
  | { kind: "create"; teamName: string; members: UserStub[] };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function teamMissingAreas(members: UserStub[]): Set<InterviewArea> {
  const present = new Set(
    members.map((m) => m.interviewArea).filter(Boolean) as InterviewArea[],
  );
  return new Set(
    ([InterviewArea.MECHANICS, InterviewArea.ELECTRONICS, InterviewArea.PROGRAMMING] as const).filter(
      (a) => !present.has(a),
    ),
  );
}

function computeAutoAssignPlan(
  unassignedUsers: UserStub[],
  existingTeams: TeamStub[],
): { steps: AssignmentStep[]; remaining: UserStub[] } {
  const pool = shuffle(unassignedUsers);
  const steps: AssignmentStep[] = [];

  // Phase 1: fill existing incomplete teams, closest-to-full first
  const incompleteTeams = existingTeams
    .filter((t) => t.count < MAX_TEAM_SIZE)
    .sort((a, b) => a.count - b.count);

  for (const team of incompleteTeams) {
    while (team.count < MAX_TEAM_SIZE && pool.length > 0) {
      const missing = teamMissingAreas(team.members);
      const idx =
        missing.size > 0
          ? pool.findIndex((u) => u.interviewArea && missing.has(u.interviewArea))
          : 0;
      const user = idx >= 0 ? pool.splice(idx, 1)[0] : pool.shift();
      if (!user) break;

      team.members.push(user);
      team.count++;
      steps.push({
        kind: "fill",
        teamId: team.id,
        teamName: team.name,
        user,
        afterCount: team.count,
      });
    }
  }

  // Phase 2: create new teams from remaining pool
  let nextTeamNum =
    existingTeams.length +
    (steps.filter((s) => s.kind === "create").length);

  while (pool.length >= MAX_TEAM_SIZE) {
    const byArea = {
      [InterviewArea.MECHANICS]: pool.filter((u) => u.interviewArea === InterviewArea.MECHANICS),
      [InterviewArea.ELECTRONICS]: pool.filter((u) => u.interviewArea === InterviewArea.ELECTRONICS),
      [InterviewArea.PROGRAMMING]: pool.filter((u) => u.interviewArea === InterviewArea.PROGRAMMING),
    };

    const hasAllRoles =
      byArea[InterviewArea.MECHANICS].length > 0 &&
      byArea[InterviewArea.ELECTRONICS].length > 0 &&
      byArea[InterviewArea.PROGRAMMING].length >= 2;

    if (!hasAllRoles) break;

    nextTeamNum++;
    const teamName = `Auto-Team ${nextTeamNum}`;
    const picks: UserStub[] = [];
    picks.push(byArea[InterviewArea.MECHANICS].shift()!);
    picks.push(byArea[InterviewArea.ELECTRONICS].shift()!);
    picks.push(byArea[InterviewArea.PROGRAMMING].shift()!);
    picks.push(byArea[InterviewArea.PROGRAMMING].shift()!);

    for (const user of picks) {
      const idx = pool.indexOf(user);
      if (idx >= 0) pool.splice(idx, 1);
    }

    steps.push({ kind: "create", teamName, members: picks });
  }

  // Phase 3: spread remaining users to any non-full team
  const fillable = existingTeams
    .filter((t) => t.count < MAX_TEAM_SIZE)
    .sort((a, b) => a.count - b.count);

  for (const user of pool) {
    const team = fillable.find((t) => t.count < MAX_TEAM_SIZE);
    if (!team) break;

    team.count++;
    steps.push({
      kind: "fill",
      teamId: team.id,
      teamName: team.name,
      user,
      afterCount: team.count,
    });
  }

  return { steps, remaining: pool };
}

export const userManagementRouter = createTRPCRouter({
  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      include: {
        team: true,
      },
      orderBy: {
        email: "asc",
      },
    });

  
    const registrationMembers = await ctx.db.registrationMember.findMany({
      where: {
        registration: { edition: CURRENT_EDITION },
        email: {
          in: users.flatMap((user) => (user.email ? [user.email] : [])),
        },
      },
      select: {
        email: true,
        registration: { select: { track: true, status: true } },
      },
    });

    const byEmail = new Map(
      registrationMembers.map((member) => [
        member.email.toLowerCase(),
        member.registration,
      ]),
    );

    return users.map((user) => ({
      ...user,
      registration: user.email
        ? (byEmail.get(user.email.toLowerCase()) ?? null)
        : null,
    }));
  }),

  assignUserToTeam: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        teamName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const team = await db.team.findUnique({
        where: { name: input.teamName },
        include: { _count: { select: { members: true } } },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      if (team._count.members >= 4) {
        throw new Error("Team is full. Maximum 4 members allowed.");
      }

      const userRole = await db.user
        .findUnique({
          where: { id: input.userId },
        })
        .then((user) => user?.role);

      console.log("Assigning user with role:", userRole);

      await db.user.update({
        where: { id: input.userId },
        data: {
          teamId: team.id,
          role: roleAfterJoiningTeam(userRole),
        },
      });

      return { success: true };
    }),

  removeUserFromTeam: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const userRole = await db.user
        .findUnique({
          where: { id: input.userId },
        })
        .then((user) => user?.role);

      await db.user.update({
        where: { id: input.userId },
        data: {
          teamId: null,
          role: roleAfterLeavingTeam(userRole),
        },
      });

      return { success: true };
    }),

  previewAutoAssign: adminProcedure.query(async () => {
    const unassigned = await db.user.findMany({
      where: { role: Role.UNASSIGNED, teamId: null },
      orderBy: { email: "asc" },
    });

    const teams = await db.team.findMany({
      where: { isActive: true },
      include: { members: true, _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });

    const teamStubs: TeamStub[] = teams.map((t) => ({
      id: t.id,
      name: t.name,
      members: t.members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        interviewArea: m.interviewArea,
        role: m.role,
      })),
      count: t._count.members,
    }));

    const userStubs: UserStub[] = unassigned.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      interviewArea: u.interviewArea,
      role: u.role,
    }));

    return computeAutoAssignPlan(userStubs, teamStubs);
  }),

  autoAssignUsers: adminProcedure.mutation(async () => {
    const unassigned = await db.user.findMany({
      where: { role: Role.UNASSIGNED, teamId: null },
      orderBy: { email: "asc" },
    });

    const teams = await db.team.findMany({
      where: { isActive: true },
      include: { members: true, _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });

    const teamStubs: TeamStub[] = teams.map((t) => ({
      id: t.id,
      name: t.name,
      members: t.members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        interviewArea: m.interviewArea,
        role: m.role,
      })),
      count: t._count.members,
    }));

    const userStubs: UserStub[] = unassigned.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      interviewArea: u.interviewArea,
      role: u.role,
    }));

    const { steps, remaining } = computeAutoAssignPlan(userStubs, teamStubs);

    let created = 0;
    await db.$transaction(async (tx) => {
      for (const step of steps) {
        if (step.kind === "fill") {
          await tx.user.update({
            where: { id: step.user.id },
            data: {
              teamId: step.teamId,
              role: roleAfterJoiningTeam(step.user.role),
            },
          });
        } else {
          const team = await tx.team.create({
            data: { name: step.teamName },
          });
          created++;
          for (const user of step.members) {
            await tx.user.update({
              where: { id: user.id },
              data: { teamId: team.id, role: roleAfterJoiningTeam(user.role) },
            });
          }
        }
      }
    });

    return {
      assigned: steps.length,
      created,
      remaining: remaining.length,
    };
  }),
});
