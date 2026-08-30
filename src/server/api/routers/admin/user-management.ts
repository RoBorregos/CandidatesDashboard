import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "rbrgs/server/db";
import { CURRENT_EDITION } from "~/lib/registration";
import { roleAfterJoiningTeam, roleAfterLeavingTeam } from "~/lib/roles";
import { InterviewArea, RegistrationStatus, Role } from "@prisma/client";

const MAX_TEAM_SIZE = 4;

const AREAS = [
  InterviewArea.MECHANICS,
  InterviewArea.ELECTRONICS,
  InterviewArea.PROGRAMMING,
] as const;

const zCandidate = z.object({
  userId: z.string().nullable(),
  registrationId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  interviewArea: z.nativeEnum(InterviewArea).nullable(),
  role: z.nativeEnum(Role).nullable(),
});

// One step per team. `teamId: null` means the team still has to be created.
const zAssignmentStep = z.object({
  teamId: z.string().nullable(),
  teamName: z.string(),
  candidates: z.array(zCandidate).min(1),
});

type Candidate = z.infer<typeof zCandidate>;

// People who registered together are placed together, so the unit that moves
// is the registration, not the person.
type Unit = { registrationId: string; candidates: Candidate[] };

type TeamSlot = {
  teamId: string | null;
  teamName: string;
  areas: Set<InterviewArea>;
  taken: number;
  additions: Candidate[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function computeAutoAssignPlan(
  units: Unit[],
  slots: TeamSlot[],
  takenNames: Set<string>,
) {
  const plan = [...slots];
  const remaining: Candidate[] = [];

  const roomIn = (slot: TeamSlot) => MAX_TEAM_SIZE - slot.taken;

  const place = (slot: TeamSlot, unit: Unit) => {
    for (const candidate of unit.candidates) {
      slot.additions.push(candidate);
      slot.taken++;
      if (candidate.interviewArea) slot.areas.add(candidate.interviewArea);
    }
  };

  const newSlot = (): TeamSlot => {
    let n = plan.length + 1;
    let teamName = `Auto-Team ${n}`;
    while (takenNames.has(teamName)) teamName = `Auto-Team ${++n}`;
    takenNames.add(teamName);

    const slot: TeamSlot = {
      teamId: null,
      teamName,
      areas: new Set(),
      taken: 0,
      additions: [],
    };

    plan.push(slot);
    return slot;
  };

  // Fullest-first, so incomplete teams get finished instead of everyone
  // being spread thin across many half-empty ones.
  const openSlot = (needed: number) =>
    plan
      .filter((slot) => roomIn(slot) >= needed)
      .sort((a, b) => roomIn(a) - roomIn(b))[0];

  // Groups that registered together need contiguous room, so they go first.
  const grouped = units
    .filter((unit) => unit.candidates.length > 1)
    .sort((a, b) => b.candidates.length - a.candidates.length);

  for (const unit of grouped) {
    if (unit.candidates.length > MAX_TEAM_SIZE) {
      remaining.push(...unit.candidates);
      continue;
    }

    place(openSlot(unit.candidates.length) ?? newSlot(), unit);
  }

  const pool = shuffle(units.filter((unit) => unit.candidates.length === 1));

  while (pool.length > 0) {
    const slot = openSlot(1) ?? newSlot();
    const missing = AREAS.filter((area) => !slot.areas.has(area));

    let idx = pool.findIndex((unit) => {
      const area = unit.candidates[0]!.interviewArea;
      return area !== null && missing.includes(area);
    });

    if (idx < 0) idx = 0;

    place(slot, pool.splice(idx, 1)[0]!);
  }

  const steps = plan
    .filter((slot) => slot.additions.length > 0)
    .map((slot) => ({
      teamId: slot.teamId,
      teamName: slot.teamName,
      candidates: slot.additions,
    }));

  return { steps, remaining };
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
    /*
     * The plan is built from registrations rather than accounts, so people who
     * have not signed in yet can be placed as well. Only accepted beginner
     * registrations of this edition take part: mentors, staff and anyone who
     * merely logged in are never treated as candidates.
     */
    const registrations = await db.registration.findMany({
      where: {
        edition: CURRENT_EDITION,
        track: "BEGINNER",
        status: RegistrationStatus.ACCEPTED,
      },
      include: { members: { orderBy: { order: "asc" } } },
    });

    const accounts = await db.user.findMany({
      where: {
        email: {
          in: registrations.flatMap((r) => r.members.map((m) => m.email)),
        },
      },
      select: { id: true, email: true, teamId: true, role: true },
    });

    const accountByEmail = new Map(
      accounts.flatMap((user) =>
        user.email ? [[user.email.toLowerCase(), user] as const] : [],
      ),
    );

    const teams = await db.team.findMany({
      where: { isActive: true },
      include: { members: true },
      orderBy: { name: "asc" },
    });

    /*
     * A team's occupancy is the people it already holds plus the people its
     * registrations name, signed in or not. Counting only User rows makes a
     * full team look empty and invites strangers into seats already taken.
     */
    const slots: TeamSlot[] = teams.map((team) => {
      const seen = new Set<string>();
      const areas = new Set<InterviewArea>();
      let taken = 0;

      const add = (key: string, area: InterviewArea | null) => {
        if (seen.has(key)) return;
        seen.add(key);
        taken++;
        if (area) areas.add(area);
      };

      for (const member of team.members) {
        add(member.email?.toLowerCase() ?? member.id, member.interviewArea);
      }

      for (const registration of registrations) {
        if (registration.teamId !== team.id) continue;

        for (const member of registration.members) {
          add(member.email.toLowerCase(), member.interviewArea);
        }
      }

      return {
        teamId: team.id,
        teamName: team.name,
        areas,
        taken,
        additions: [],
      };
    });

    const units: Unit[] = [];

    for (const registration of registrations) {
      // Already pointed at a team, or emptied out by hand — nothing to place.
      if (registration.teamId || registration.members.length === 0) continue;

      // Someone in the group already sits on a team; leave it to the admin.
      const anyPlaced = registration.members.some(
        (member) => accountByEmail.get(member.email.toLowerCase())?.teamId,
      );

      if (anyPlaced) continue;

      units.push({
        registrationId: registration.id,
        candidates: registration.members.map((member) => {
          const account = accountByEmail.get(member.email.toLowerCase());

          return {
            userId: account?.id ?? null,
            registrationId: registration.id,
            name: member.name,
            email: member.email,
            interviewArea: member.interviewArea,
            role: account?.role ?? null,
          };
        }),
      });
    }

    const takenNames = new Set(
      (await db.team.findMany({ select: { name: true } })).map((t) => t.name),
    );

    return computeAutoAssignPlan(units, slots, takenNames);
  }),

  autoAssignUsers: adminProcedure
    .input(z.object({ steps: z.array(zAssignmentStep) }))
    .mutation(async ({ input }) => {
      const candidates = input.steps.flatMap((step) => step.candidates);

      /*
       * The plan was computed client-side and may be minutes old. Re-check it
       * before writing: someone may have signed in and landed in a team, or
       * had their registration accepted into one, since the preview ran.
       */
      const registrationIds = [
        ...new Set(candidates.map((candidate) => candidate.registrationId)),
      ];

      const stale = await db.registration.count({
        where: { id: { in: registrationIds }, NOT: { teamId: null } },
      });

      if (stale > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${stale} registration(s) already belong to a team. Recompute the assignment.`,
        });
      }

      const userIds = candidates.flatMap((candidate) =>
        candidate.userId ? [candidate.userId] : [],
      );

      if (userIds.length > 0) {
        const placed = await db.user.count({
          where: { id: { in: userIds }, NOT: { teamId: null } },
        });

        if (placed > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `${placed} user(s) already joined a team since this plan was computed. Recompute the assignment.`,
          });
        }
      }

      let created = 0;

      await db.$transaction(async (tx) => {
        for (const step of input.steps) {
          let teamId = step.teamId;

          if (!teamId) {
            const team = await tx.team.create({ data: { name: step.teamName } });
            teamId = team.id;
            created++;
          }

          const stepRegistrations = [
            ...new Set(step.candidates.map((c) => c.registrationId)),
          ];

          // Placing the registration is what carries people who have never
          // signed in; their User row is created and linked at first login.
          for (const registrationId of stepRegistrations) {
            await tx.registration.update({
              where: { id: registrationId },
              data: { teamId },
            });
          }

          for (const candidate of step.candidates) {
            if (!candidate.userId) continue;

            await tx.user.update({
              where: { id: candidate.userId },
              data: { teamId, role: roleAfterJoiningTeam(candidate.role) },
            });
          }
        }
      });

      return { assigned: candidates.length, created };
    }),
});
