import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "rbrgs/server/db";
import { CURRENT_EDITION } from "~/lib/registration";
import { roleAfterJoiningTeam, roleAfterLeavingTeam } from "~/lib/roles";
import { InterviewArea, Role } from "@prisma/client";

const MAX_TEAM_SIZE = 4;

const zUserStub = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  interviewArea: z.nativeEnum(InterviewArea).nullable(),
  role: z.nativeEnum(Role),
});

const zAssignmentStep = z.union([
  z.object({
    kind: z.literal("fill"),
    teamId: z.string(),
    teamName: z.string(),
    user: zUserStub,
    afterCount: z.number(),
  }),
  z.object({
    kind: z.literal("create"),
    teamName: z.string(),
    members: z.array(zUserStub),
  }),
]);

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
    const beginners = await db.registrationMember.findMany({
      where: {
        edition: CURRENT_EDITION,
        registration: { track: "BEGINNER" },
      },
      select: {
        id: true,
        name: true,
        email: true,
        interviewArea: true,
        registration: { select: { teamId: true } },
      },
    });

    const destinationByEmail = new Map(
      beginners.map((member) => [
        member.email.toLowerCase(),
        member.registration.teamId,
      ]),
    );

    const unassigned = await db.user.findMany({
      where: { role: Role.UNASSIGNED, teamId: null },
      orderBy: { email: "asc" },
    });

    const userStubs: UserStub[] = unassigned
      .filter((user) => {
        if (!user.email) return false;

        const email = user.email.toLowerCase();

        return destinationByEmail.has(email) && !destinationByEmail.get(email);
      })
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        interviewArea: u.interviewArea,
        role: u.role,
      }));

    const teams = await db.team.findMany({
      where: { isActive: true },
      include: { members: true },
      orderBy: { name: "asc" },
    });

    const teamStubs: TeamStub[] = teams.map((t) => {
      const seen = new Set<string>();
      const members: UserStub[] = [];

      for (const member of t.members) {
        const key = member.email?.toLowerCase() ?? member.id;
        if (seen.has(key)) continue;
        seen.add(key);

        members.push({
          id: member.id,
          name: member.name,
          email: member.email,
          interviewArea: member.interviewArea,
          role: member.role,
        });
      }

      for (const member of beginners) {
        if (member.registration.teamId !== t.id) continue;

        const key = member.email.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        members.push({
          id: `pending:${member.id}`,
          name: member.name,
          email: member.email,
          interviewArea: member.interviewArea,
          role: Role.UNASSIGNED,
        });
      }

      return { id: t.id, name: t.name, members, count: members.length };
    });

    return computeAutoAssignPlan(userStubs, teamStubs);
  }),

  autoAssignUsers: adminProcedure
    .input(z.object({ steps: z.array(zAssignmentStep) }))
    .mutation(async ({ input }) => {
      const targetIds = input.steps.flatMap((step) =>
        step.kind === "fill"
          ? [step.user.id]
          : step.members.map((member) => member.id),
      );

      if (targetIds.length > 0) {
        const targets = await db.user.findMany({
          where: { id: { in: targetIds } },
          select: { id: true, email: true, teamId: true },
        });

        const alreadyPlaced = targets.filter((user) => user.teamId);

        if (alreadyPlaced.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `${alreadyPlaced.length} user(s) already joined a team since this plan was computed. Recompute the assignment.`,
          });
        }

        const beginnerEmails = await db.registrationMember
          .findMany({
            where: {
              edition: CURRENT_EDITION,
              registration: { track: "BEGINNER" },
              email: {
                in: targets.flatMap((user) => (user.email ? [user.email] : [])),
              },
            },
            select: { email: true },
          })
          .then(
            (rows) => new Set(rows.map((row) => row.email.toLowerCase())),
          );

        const notCandidates = targets.filter(
          (user) =>
            !user.email || !beginnerEmails.has(user.email.toLowerCase()),
        );

        if (notCandidates.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `${notCandidates.length} user(s) in this plan have no beginner registration. Recompute the assignment.`,
          });
        }
      }

      let created = 0;
      await db.$transaction(async (tx) => {
        for (const step of input.steps) {
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
        assigned: input.steps.length,
        created,
      };
    }),
});
