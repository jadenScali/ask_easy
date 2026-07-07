import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "../generated/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParticipantStats {
  userId: string;
  name: string;
  role: Role;
  questionsAsked: number;
  answersGiven: number;
  upvotesReceived: number;
}

export interface WeeklyEngagement {
  /** 1-based week index from the anchor week. */
  week: number;
  /** ISO date of that week's Monday. */
  weekStart: string;
  questions: number;
  answers: number;
  activeUsers: number;
}

export interface CourseAnalytics {
  course: { id: string; code: string; name: string };
  summary: {
    totalQuestions: number;
    totalAnswers: number;
    activeParticipants: number;
    answeredRate: number;
  };
  participants: ParticipantStats[];
  weekly: WeeklyEngagement[];
}

export interface AnalyticsOptions {
  from?: Date;
  to?: Date;
  /** Anchor for week numbering; defaults to the earliest session start. */
  weekStart?: Date;
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/**
 * Only instructors (PROFESSOR or TA) enrolled in the course may view its
 * analytics. This is course-scoped and independent of the site-admin
 * whitelist.
 */
export async function canViewCourseAnalytics(userId: string, courseId: string): Promise<boolean> {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { role: true },
  });
  return enrollment?.role === "PROFESSOR" || enrollment?.role === "TA";
}

// ---------------------------------------------------------------------------
// Week bucketing helpers
// ---------------------------------------------------------------------------

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns the UTC Monday 00:00 of the ISO week containing `date`. */
export function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}

interface WeeklyRow {
  weekStart: Date;
  questions: number;
  answers: number;
  activeUsers: number;
}

/**
 * Expands sparse per-week rows into a contiguous series (empty weeks are
 * reported as 0, not skipped), numbered 1-based from the anchor week.
 */
export function fillWeeklyBuckets(rows: WeeklyRow[], anchor: Date): WeeklyEngagement[] {
  if (rows.length === 0) return [];

  // Re-normalize row keys to UTC Monday midnight so bucket lookup can't be
  // thrown off by how the driver parsed the DB's date_trunc timestamps.
  const keyed = rows.map((r) => ({ ...r, key: startOfIsoWeek(r.weekStart).getTime() }));

  const anchorWeek = startOfIsoWeek(anchor);
  // Never number a data week below 1 — extend the anchor back if data
  // predates it.
  const first = Math.min(anchorWeek.getTime(), keyed[0].key);
  const last = keyed[keyed.length - 1].key;

  const byWeek = new Map(keyed.map((r) => [r.key, r]));
  const weekly: WeeklyEngagement[] = [];
  for (let t = first, week = 1; t <= last; t += WEEK_MS, week++) {
    const row = byWeek.get(t);
    weekly.push({
      week,
      weekStart: new Date(t).toISOString().slice(0, 10),
      questions: row?.questions ?? 0,
      answers: row?.answers ?? 0,
      activeUsers: row?.activeUsers ?? 0,
    });
  }
  return weekly;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Per-participant contribution stats for a course, joined via
 * Question/Answer → Session.courseId. Anonymous posts are attributed to
 * their real author (aggregate counts only — no content is exposed).
 */
export async function getParticipantBreakdown(
  courseId: string,
  sessionIds: string[],
  from?: Date,
  to?: Date
): Promise<ParticipantStats[]> {
  const createdAt = from || to ? { gte: from, lte: to } : undefined;

  const [questionStats, answerStats] = await Promise.all([
    prisma.question.groupBy({
      by: ["authorId"],
      where: { sessionId: { in: sessionIds }, createdAt },
      _count: { _all: true },
      _sum: { upvoteCount: true },
    }),
    prisma.answer.groupBy({
      by: ["authorId"],
      where: { question: { sessionId: { in: sessionIds } }, createdAt },
      _count: { _all: true },
      _sum: { upvoteCount: true },
    }),
  ]);

  const byUser = new Map<
    string,
    { questionsAsked: number; answersGiven: number; upvotesReceived: number }
  >();
  const get = (userId: string) => {
    let entry = byUser.get(userId);
    if (!entry) {
      entry = { questionsAsked: 0, answersGiven: 0, upvotesReceived: 0 };
      byUser.set(userId, entry);
    }
    return entry;
  };

  for (const q of questionStats) {
    if (!q.authorId) continue; // legacy rows without an author
    const entry = get(q.authorId);
    entry.questionsAsked = q._count._all;
    entry.upvotesReceived += q._sum.upvoteCount ?? 0;
  }
  for (const a of answerStats) {
    const entry = get(a.authorId);
    entry.answersGiven = a._count._all;
    entry.upvotesReceived += a._sum.upvoteCount ?? 0;
  }

  const userIds = [...byUser.keys()];
  const [users, enrollments] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    }),
    prisma.courseEnrollment.findMany({
      where: { courseId, userId: { in: userIds } },
      select: { userId: true, role: true },
    }),
  ]);
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const roleById = new Map(enrollments.map((e) => [e.userId, e.role]));

  return [...byUser.entries()]
    .map(([userId, stats]) => ({
      userId,
      name: nameById.get(userId) ?? "Unknown",
      // Participants no longer enrolled (e.g. dropped) default to STUDENT
      role: roleById.get(userId) ?? Role.STUDENT,
      ...stats,
    }))
    .sort((a, b) => b.questionsAsked + b.answersGiven - (a.questionsAsked + a.answersGiven));
}

/**
 * Weekly questions/answers/active-user counts across the course, bucketed by
 * ISO week in the database (no per-row loading).
 */
export async function getWeeklyEngagement(
  sessionIds: string[],
  anchor: Date,
  from?: Date,
  to?: Date
): Promise<WeeklyEngagement[]> {
  const rows = await prisma.$queryRaw<WeeklyRow[]>(Prisma.sql`
    SELECT date_trunc('week', x."createdAt") AS "weekStart",
           COUNT(*) FILTER (WHERE x.kind = 'question')::int AS "questions",
           COUNT(*) FILTER (WHERE x.kind = 'answer')::int AS "answers",
           COUNT(DISTINCT x."authorId")::int AS "activeUsers"
    FROM (
      SELECT q."createdAt", q."authorId", 'question' AS kind
      FROM "Question" q
      WHERE q."sessionId" = ANY(${sessionIds})
      UNION ALL
      SELECT a."createdAt", a."authorId", 'answer' AS kind
      FROM "Answer" a
      JOIN "Question" q ON q."id" = a."questionId"
      WHERE q."sessionId" = ANY(${sessionIds})
    ) x
    WHERE (CAST(${from ?? null} AS timestamptz) IS NULL OR x."createdAt" >= ${from ?? null})
      AND (CAST(${to ?? null} AS timestamptz) IS NULL OR x."createdAt" <= ${to ?? null})
    GROUP BY 1
    ORDER BY 1
  `);

  return fillWeeklyBuckets(rows, anchor);
}

/**
 * Full analytics payload for a course. `course` is passed in (the route has
 * already fetched it for the 404 check).
 */
export async function getCourseAnalytics(
  course: { id: string; code: string; name: string },
  options: AnalyticsOptions = {}
): Promise<CourseAnalytics> {
  const { from, to } = options;

  const sessions = await prisma.session.findMany({
    where: { courseId: course.id },
    select: { id: true, startTime: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const sessionIds = sessions.map((s) => s.id);

  const empty: CourseAnalytics = {
    course,
    summary: { totalQuestions: 0, totalAnswers: 0, activeParticipants: 0, answeredRate: 0 },
    participants: [],
    weekly: [],
  };
  if (sessionIds.length === 0) return empty;

  // Week numbering anchor: explicit weekStart wins, then the range start (so
  // a filtered view starts at week 1 instead of leading empty weeks), then
  // the earliest session.
  const anchor = options.weekStart ?? from ?? sessions[0].startTime ?? sessions[0].createdAt;
  const createdAt = from || to ? { gte: from, lte: to } : undefined;
  const questionWhere = { sessionId: { in: sessionIds }, createdAt };

  const [participants, weekly, totalQuestions, answeredQuestions, totalAnswers] = await Promise.all(
    [
      getParticipantBreakdown(course.id, sessionIds, from, to),
      getWeeklyEngagement(sessionIds, anchor, from, to),
      prisma.question.count({ where: questionWhere }),
      prisma.question.count({
        where: { ...questionWhere, status: { in: ["ANSWERED", "RESOLVED"] } },
      }),
      prisma.answer.count({
        where: { question: { sessionId: { in: sessionIds } }, createdAt },
      }),
    ]
  );

  return {
    course,
    summary: {
      totalQuestions,
      totalAnswers,
      activeParticipants: participants.length,
      answeredRate: totalQuestions === 0 ? 0 : answeredQuestions / totalQuestions,
    },
    participants,
    weekly,
  };
}
