import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, mentorProcedure } from "~/server/api/trpc";
import { CURRENT_EDITION } from "~/lib/registration";
import { beginnerTeamIds } from "~/server/teams";
import type { InterviewArea, PrismaClient } from "@prisma/client";
import {
  InterviewArea as InterviewAreaEnum,
  ObjectiveStatus,
  RubricLevel,
} from "@prisma/client";
import { MAX_TRACKING_WEEK, RUBRIC_CRITERION_KEYS } from "~/lib/rubric";
import {
  INTRO_CANDIDATE_QUESTION_KEYS,
  INTRO_TEAM_QUESTION_KEYS,
} from "~/lib/intro-meeting";

type Contact = { phone: string; interviewArea: InterviewArea | null };

/*
 * Phone and interview area live on RegistrationMember, but a team's members
 * are Users. RegistrationMember.userId is never written by the app, so the
 * two are matched by email, the same way acceptRegistration does it.
 */
async function contactsByEmail(
  db: PrismaClient,
  emails: string[],
): Promise<Map<string, Contact>> {
  if (emails.length === 0) return new Map();

  const members = await db.registrationMember.findMany({
    where: { edition: CURRENT_EDITION, email: { in: emails } },
    select: { email: true, phone: true, interviewArea: true },
  });

  return new Map(
    members.map((member) => [
      member.email.toLowerCase(),
      { phone: member.phone, interviewArea: member.interviewArea },
    ]),
  );
}

type RosterMember = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  interviewArea: InterviewArea | null;
  // False until they sign in for the first time — the mentor's cue to chase them.
  hasAccount: boolean;
};

/*
 * The full roster of a team, including whoever has never signed in.
 *
 * Team.members only holds Users, and a User row doesn't exist until first
 * login, so a mentor reading it never sees the candidates they most need to
 * contact. The registrations placed on the team carry everyone — with the
 * phone number — so the roster starts there and folds the accounts in.
 *
 * Both ways a team is filled set Registration.teamId (acceptRegistration and
 * autoAssignUsers), so registrations cover both.
 */
async function teamRosters(
  db: PrismaClient,
  teamIds: string[],
): Promise<Map<string, RosterMember[]>> {
  const rosters = new Map<string, RosterMember[]>();
  const seenByTeam = new Map<string, Set<string>>();

  for (const teamId of teamIds) {
    rosters.set(teamId, []);
    seenByTeam.set(teamId, new Set());
  }

  if (teamIds.length === 0) return rosters;

  const registrations = await db.registration.findMany({
    where: { teamId: { in: teamIds } },
    select: {
      teamId: true,
      members: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          interviewArea: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  const memberEmails = registrations.flatMap((registration) =>
    registration.members.map((member) => member.email),
  );

  /*
   * Accounts are pulled by team *and* by registered email: someone can have an
   * account whose teamId isn't set yet, and they shouldn't be reported as
   * having never signed in.
   */
  const users = await db.user.findMany({
    where: {
      OR: [{ teamId: { in: teamIds } }, { email: { in: memberEmails } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      interviewArea: true,
      teamId: true,
    },
  });

  const userByEmail = new Map(
    users.flatMap((user) =>
      user.email ? [[user.email.toLowerCase(), user] as const] : [],
    ),
  );

  for (const registration of registrations) {
    const roster = registration.teamId
      ? rosters.get(registration.teamId)
      : undefined;
    const seen = registration.teamId
      ? seenByTeam.get(registration.teamId)
      : undefined;

    if (!roster || !seen) continue;

    for (const member of registration.members) {
      const key = member.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const user = userByEmail.get(key);

      roster.push({
        id: user?.id ?? member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        interviewArea: member.interviewArea ?? user?.interviewArea ?? null,
        hasAccount: Boolean(user),
      });
    }
  }

  // Accounts sitting in a team that no registration on that team covers.
  const orphanEmails = users.flatMap((user) =>
    user.teamId && rosters.has(user.teamId) && user.email ? [user.email] : [],
  );

  const contacts = await contactsByEmail(db, orphanEmails);

  for (const user of users) {
    const roster = user.teamId ? rosters.get(user.teamId) : undefined;
    const seen = user.teamId ? seenByTeam.get(user.teamId) : undefined;

    if (!roster || !seen) continue;

    const key = user.email?.toLowerCase() ?? user.id;
    if (seen.has(key)) continue;
    seen.add(key);

    const contact = user.email
      ? contacts.get(user.email.toLowerCase())
      : undefined;

    roster.push({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: contact?.phone ?? null,
      interviewArea: user.interviewArea ?? contact?.interviewArea ?? null,
      hasAccount: true,
    });
  }

  return rosters;
}

/*
 * Weekly tracking is only writable by the pair the team belongs to. Anything
 * that reads or writes it goes through here first.
 */
async function assertMentorsTeam(
  db: PrismaClient,
  mentorId: string,
  teamId: string,
) {
  const assignment = await db.teamMentorPair.findUnique({
    where: { teamId },
    select: {
      mentorPair: {
        select: { mentorAId: true, mentorBId: true, edition: true },
      },
    },
  });

  const pair = assignment?.mentorPair;

  if (
    !pair ||
    pair.edition !== CURRENT_EDITION ||
    (pair.mentorAId !== mentorId && pair.mentorBId !== mentorId)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This team isn't assigned to your pair.",
    });
  }
}

/** Nothing on a team's sheet may point at someone who isn't on that team. */
async function assertTeamMember(
  db: PrismaClient,
  candidateId: string,
  teamId: string,
) {
  const member = await db.user.findFirst({
    where: { id: candidateId, teamId },
    select: { id: true },
  });

  if (!member) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That candidate isn't on this team.",
    });
  }
}

export const mentorRouter = createTRPCRouter({
  getCurrentWeek: mentorProcedure.query(async ({ ctx }) => {
    const config = await ctx.db.config.findFirst({
      select: { currentWeek: true },
    });

    return config?.currentWeek ?? 1;
  }),

  getMyPair: mentorProcedure.query(async ({ ctx }) => {
    const pair = await ctx.db.mentorPair.findFirst({
      where: {
        edition: CURRENT_EDITION,
        OR: [
          { mentorAId: ctx.session.user.id },
          { mentorBId: ctx.session.user.id },
        ],
      },
      include: {
        mentorA: { select: { id: true, name: true, email: true } },
        mentorB: { select: { id: true, name: true, email: true } },
        teams: {
          include: {
            team: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!pair) return null;

    /*
     * Built from the registrations, not Team.members, so candidates who have
     * never signed in still reach their mentor with a phone number.
     */
    const rosters = await teamRosters(
      ctx.db,
      pair.teams.map((assignment) => assignment.teamId),
    );

    return {
      ...pair,
      teams: pair.teams.map((assignment) => ({
        ...assignment,
        team: {
          ...assignment.team,
          members: rosters.get(assignment.teamId) ?? [],
        },
      })),
    };
  }),

  /*
   * Advanced candidates are covered by challenge, not one by one: whoever is
   * listed for a challenge this edition mentors everyone registered for it.
   */
  getMyChallengeCandidates: mentorProcedure.query(async ({ ctx }) => {
    const myChallenges = await ctx.db.mentorChallenge.findMany({
      where: { mentorId: ctx.session.user.id, edition: CURRENT_EDITION },
      select: { challenge: true },
      orderBy: { challenge: "asc" },
    });

    if (myChallenges.length === 0) {
      return [];
    }

    const challenges = myChallenges.map((row) => row.challenge);

    const members = await ctx.db.registrationMember.findMany({
      where: {
        registration: {
          edition: CURRENT_EDITION,
          track: "ADVANCED",
          challenge: { in: challenges },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        interviewArea: true,
        registration: { select: { challenge: true } },
      },
      orderBy: { name: "asc" },
    });

    return challenges.map((challenge) => ({
      challenge,
      candidates: members
        .filter((member) => member.registration.challenge === challenge)
        .map(({ registration: _registration, ...member }) => member),
    }));
  }),

  /*
   * Everything the weekly sheet needs for one team and one week, plus the
   * previous week's objectives — those are what the mentors sit down to
   * evaluate, so they have to be on screen while filling this week in.
   */
  getWeeklyTracking: mentorProcedure
    .input(
      z.object({
        teamId: z.string(),
        week: z.number().int().min(1).max(MAX_TRACKING_WEEK),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertMentorsTeam(ctx.db, ctx.session.user.id, input.teamId);

      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
        select: {
          id: true,
          name: true,
          members: {
            select: {
              id: true,
              name: true,
              email: true,
              interviewArea: true,
            },
            orderBy: { name: "asc" },
          },
        },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
      }

      const objectives = await ctx.db.weeklyObjective.findMany({
        where: {
          teamId: input.teamId,
          edition: CURRENT_EDITION,
          week: { in: [input.week, input.week - 1] },
        },
        include: { scores: true },
        // Creation order is what numbers the objectives 1, 2, 3 within an area.
        orderBy: [{ area: "asc" }, { createdAt: "asc" }],
      });

      const reviews = await ctx.db.weeklyCandidateReview.findMany({
        where: {
          teamId: input.teamId,
          edition: CURRENT_EDITION,
          week: input.week,
        },
        include: { answers: true },
      });

      const teamNote = await ctx.db.weeklyTeamNote.findUnique({
        where: {
          teamId_edition_week: {
            teamId: input.teamId,
            edition: CURRENT_EDITION,
            week: input.week,
          },
        },
        include: { answers: true },
      });

      return {
        team,
        week: input.week,
        objectives: objectives.filter((row) => row.week === input.week),
        previousObjectives: objectives.filter(
          (row) => row.week === input.week - 1,
        ),
        reviews,
        teamNote,
      };
    }),

  /*
   * One objective row and its rubric. An area can hold several objectives, so
   * the row is addressed by id: no id means the mentor just added it.
   */
  saveWeeklyObjective: mentorProcedure
    .input(
      z.object({
        teamId: z.string(),
        week: z.number().int().min(1).max(MAX_TRACKING_WEEK),
        id: z.string().optional(),
        area: z.nativeEnum(InterviewAreaEnum),
        candidateId: z.string().nullable().optional(),
        objective: z.string().trim().min(1).max(1000),
        status: z.nativeEnum(ObjectiveStatus).nullable().optional(),
        notes: z.string().trim().max(2000).optional(),
        scores: z.array(
          z.object({
            criterion: z.enum(RUBRIC_CRITERION_KEYS),
            level: z.nativeEnum(RubricLevel),
            justification: z.string().trim().max(2000).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertMentorsTeam(ctx.db, ctx.session.user.id, input.teamId);

      if (input.candidateId) {
        await assertTeamMember(ctx.db, input.candidateId, input.teamId);
      }

      /*
       * An id from somewhere else would otherwise let a mentor rewrite another
       * team's objective, so it has to match the row this sheet is showing.
       */
      if (input.id) {
        const existing = await ctx.db.weeklyObjective.findUnique({
          where: { id: input.id },
          select: { teamId: true, edition: true, week: true },
        });

        if (
          !existing ||
          existing.teamId !== input.teamId ||
          existing.edition !== CURRENT_EDITION ||
          existing.week !== input.week
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That objective isn't part of this week's sheet.",
          });
        }
      }

      const data = {
        area: input.area,
        candidateId: input.candidateId ?? null,
        objective: input.objective,
        status: input.status ?? null,
        notes: input.notes ?? null,
        updatedById: ctx.session.user.id,
      };

      return ctx.db.$transaction(async (tx) => {
        const objective = input.id
          ? await tx.weeklyObjective.update({
              where: { id: input.id },
              data,
            })
          : await tx.weeklyObjective.create({
              data: {
                teamId: input.teamId,
                edition: CURRENT_EDITION,
                week: input.week,
                ...data,
              },
            });

        /*
         * A criterion left unmarked is cleared rather than kept, so the saved
         * rubric always matches what the mentor sees on screen.
         */
        await tx.weeklyRubricScore.deleteMany({
          where: {
            objectiveId: objective.id,
            criterion: { notIn: input.scores.map((score) => score.criterion) },
          },
        });

        for (const score of input.scores) {
          await tx.weeklyRubricScore.upsert({
            where: {
              objectiveId_criterion: {
                objectiveId: objective.id,
                criterion: score.criterion,
              },
            },
            create: {
              objectiveId: objective.id,
              criterion: score.criterion,
              level: score.level,
              justification: score.justification ?? null,
            },
            update: {
              level: score.level,
              justification: score.justification ?? null,
            },
          });
        }

        // The client needs this to stop treating a new row as unsaved.
        return { id: objective.id };
      });
    }),

  deleteWeeklyObjective: mentorProcedure
    .input(z.object({ objectiveId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const objective = await ctx.db.weeklyObjective.findUnique({
        where: { id: input.objectiveId },
        select: { teamId: true },
      });

      if (!objective) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Objective not found.",
        });
      }

      await assertMentorsTeam(ctx.db, ctx.session.user.id, objective.teamId);

      // Its rubric scores go with it, by cascade.
      await ctx.db.weeklyObjective.delete({ where: { id: input.objectiveId } });

      return { success: true };
    }),

  saveWeeklyReview: mentorProcedure
    .input(
      z.object({
        teamId: z.string(),
        week: z.number().int().min(1).max(MAX_TRACKING_WEEK),
        candidateId: z.string(),
        evidence: z.string().trim().max(2000).optional(),
        mentorQuestions: z.string().trim().max(2000).optional(),
        justification: z.string().trim().max(2000).optional(),
        strengths: z.string().trim().max(2000).optional(),
        opportunities: z.string().trim().max(2000).optional(),
        recommendations: z.string().trim().max(2000).optional(),
        answers: z.array(
          z.object({
            questionKey: z.enum(INTRO_CANDIDATE_QUESTION_KEYS),
            answer: z.string().trim().max(2000),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertMentorsTeam(ctx.db, ctx.session.user.id, input.teamId);
      await assertTeamMember(ctx.db, input.candidateId, input.teamId);

      const data = {
        evidence: input.evidence ?? null,
        mentorQuestions: input.mentorQuestions ?? null,
        justification: input.justification ?? null,
        strengths: input.strengths ?? null,
        opportunities: input.opportunities ?? null,
        recommendations: input.recommendations ?? null,
        updatedById: ctx.session.user.id,
      };

      await ctx.db.$transaction(async (tx) => {
        const review = await tx.weeklyCandidateReview.upsert({
          where: {
            candidateId_edition_week: {
              candidateId: input.candidateId,
              edition: CURRENT_EDITION,
              week: input.week,
            },
          },
          create: {
            teamId: input.teamId,
            candidateId: input.candidateId,
            edition: CURRENT_EDITION,
            week: input.week,
            ...data,
          },
          /*
           * teamId is refreshed too: the row is keyed by candidate and week,
           * so a candidate who changed teams would otherwise keep a review
           * pointing at the old team and disappear from this team's sheet.
           */
          update: { ...data, teamId: input.teamId },
        });

        /*
         * A question left blank is cleared rather than kept, so the saved
         * answers always match what the mentor sees on screen.
         */
        await tx.weeklyCandidateAnswer.deleteMany({
          where: {
            reviewId: review.id,
            questionKey: {
              notIn: input.answers.map((answer) => answer.questionKey),
            },
          },
        });

        for (const answer of input.answers) {
          await tx.weeklyCandidateAnswer.upsert({
            where: {
              reviewId_questionKey: {
                reviewId: review.id,
                questionKey: answer.questionKey,
              },
            },
            create: {
              reviewId: review.id,
              questionKey: answer.questionKey,
              answer: answer.answer,
            },
            update: { answer: answer.answer },
          });
        }
      });

      return { success: true };
    }),

  /* The team-wide half of the intro meeting: guide questions and free notes. */
  saveTeamNote: mentorProcedure
    .input(
      z.object({
        teamId: z.string(),
        week: z.number().int().min(1).max(MAX_TRACKING_WEEK),
        generalNotes: z.string().trim().max(4000).optional(),
        answers: z.array(
          z.object({
            questionKey: z.enum(INTRO_TEAM_QUESTION_KEYS),
            answer: z.string().trim().max(2000),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertMentorsTeam(ctx.db, ctx.session.user.id, input.teamId);

      const data = {
        generalNotes: input.generalNotes ?? null,
        updatedById: ctx.session.user.id,
      };

      await ctx.db.$transaction(async (tx) => {
        const note = await tx.weeklyTeamNote.upsert({
          where: {
            teamId_edition_week: {
              teamId: input.teamId,
              edition: CURRENT_EDITION,
              week: input.week,
            },
          },
          create: {
            teamId: input.teamId,
            edition: CURRENT_EDITION,
            week: input.week,
            ...data,
          },
          update: data,
        });

        await tx.weeklyTeamAnswer.deleteMany({
          where: {
            noteId: note.id,
            questionKey: {
              notIn: input.answers.map((answer) => answer.questionKey),
            },
          },
        });

        for (const answer of input.answers) {
          await tx.weeklyTeamAnswer.upsert({
            where: {
              noteId_questionKey: {
                noteId: note.id,
                questionKey: answer.questionKey,
              },
            },
            create: {
              noteId: note.id,
              questionKey: answer.questionKey,
              answer: answer.answer,
            },
            update: { answer: answer.answer },
          });
        }
      });

      return { success: true };
    }),

  reportTeamConflict: mentorProcedure
    .input(z.object({ teamId: z.string(), knowsSomeone: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const pair = await ctx.db.mentorPair.findFirst({
        where: {
          edition: CURRENT_EDITION,
          OR: [
            { mentorAId: ctx.session.user.id },
            { mentorBId: ctx.session.user.id },
          ],
        },
      });

      if (!pair) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have a mentor pair.",
        });
      }

      const assignment = await ctx.db.teamMentorPair.findUnique({
        where: { teamId: input.teamId },
      });

      if (!assignment || assignment.mentorPairId !== pair.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This team isn't assigned to your pair.",
        });
      }

      const isMentorA = pair.mentorAId === ctx.session.user.id;

      if (!input.knowsSomeone) {
        await ctx.db.teamMentorPair.update({
          where: { teamId: input.teamId },
          data: isMentorA
            ? { mentorAKnowsTeam: false }
            : { mentorBKnowsTeam: false },
        });

        return { reassigned: false, newTeamId: null };
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.mentorPairTeamConflict.upsert({
          where: {
            mentorPairId_teamId: {
              mentorPairId: pair.id,
              teamId: input.teamId,
            },
          },
          create: {
            mentorPairId: pair.id,
            teamId: input.teamId,
            reportedById: ctx.session.user.id,
          },
          update: {},
        });

        await tx.teamMentorPair.delete({ where: { teamId: input.teamId } });

        const conflicts = await tx.mentorPairTeamConflict.findMany({
          where: { mentorPairId: pair.id },
          select: { teamId: true },
        });

        const rejected = new Set(conflicts.map((conflict) => conflict.teamId));
        const beginnerIds = await beginnerTeamIds(tx, CURRENT_EDITION);

        // `rejected` covers input.teamId too — it was just recorded above.
        const nextTeam = await tx.team.findFirst({
          where: {
            isActive: true,
            mentorPair: null,
            id: { in: beginnerIds.filter((id) => !rejected.has(id)) },
          },
          orderBy: { name: "asc" },
        });

        if (nextTeam) {
          await tx.teamMentorPair.create({
            data: { teamId: nextTeam.id, mentorPairId: pair.id },
          });
        }

        return { reassigned: true, newTeamId: nextTeam?.id ?? null };
      });
    }),
});
