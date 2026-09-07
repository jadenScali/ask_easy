// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "../generated/prisma";
import {
  canViewCourseAnalytics,
  getCourseAnalytics,
  startOfIsoWeek,
  fillWeeklyBuckets,
} from "@/lib/courseAnalytics";

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean all tables in dependency order
  await prisma.answerUpvote.deleteMany();
  await prisma.questionUpvote.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.question.deleteMany();
  await prisma.slideSet.deleteMany();
  await prisma.session.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
});

// Fixed Mondays for stable week bucketing
const WEEK1 = new Date("2026-01-05T10:00:00.000Z");
const WEEK3 = new Date("2026-01-19T10:00:00.000Z");

/**
 * Seeds a course with:
 *  - prof (PROFESSOR), ta (TA), student1/student2 (STUDENT)
 *  - two sessions (weeks 1 and 3) plus an unrelated second course
 *  - 3 questions in the course (2 by student1 in week 1, one anonymous;
 *    1 by student2 in week 3) with statuses RESOLVED/ANSWERED/OPEN
 *  - 3 answers (2 by ta, 1 by prof)
 *  - 1 question in the other course that must never leak in
 */
async function seed() {
  const [prof, ta, student1, student2, outsider] = await Promise.all(
    ["prof01", "ta01", "stu01", "stu02", "out01"].map((utorid, i) =>
      prisma.user.create({
        data: {
          utorid,
          email: `${utorid}@utoronto.ca`,
          name: `User ${i + 1}`,
          role: "STUDENT",
        },
      })
    )
  );

  const course = await prisma.course.create({
    data: { code: "CSC209", name: "Systems Programming", semester: "W26", createdById: prof.id },
  });
  const otherCourse = await prisma.course.create({
    data: { code: "CSC343", name: "Databases", semester: "W26", createdById: prof.id },
  });

  await prisma.courseEnrollment.createMany({
    data: [
      { userId: prof.id, courseId: course.id, role: "PROFESSOR" },
      { userId: ta.id, courseId: course.id, role: "TA" },
      { userId: student1.id, courseId: course.id, role: "STUDENT" },
      { userId: student2.id, courseId: course.id, role: "STUDENT" },
      { userId: outsider.id, courseId: otherCourse.id, role: "STUDENT" },
    ],
  });

  const session1 = await prisma.session.create({
    data: {
      courseId: course.id,
      createdById: prof.id,
      title: "Lecture 1",
      joinCode: "AAA111",
      status: "ENDED",
      startTime: WEEK1,
      createdAt: WEEK1,
    },
  });
  const session2 = await prisma.session.create({
    data: {
      courseId: course.id,
      createdById: prof.id,
      title: "Lecture 3",
      joinCode: "BBB222",
      status: "ENDED",
      startTime: WEEK3,
      createdAt: WEEK3,
    },
  });
  const otherSession = await prisma.session.create({
    data: {
      courseId: otherCourse.id,
      createdById: prof.id,
      title: "Other",
      joinCode: "CCC333",
      status: "ENDED",
      createdAt: WEEK1,
    },
  });

  const q1 = await prisma.question.create({
    data: {
      sessionId: session1.id,
      authorId: student1.id,
      content: "What is a pointer?",
      status: "RESOLVED",
      upvoteCount: 3,
      createdAt: WEEK1,
    },
  });
  // Anonymous — must still be attributed to student1 in aggregate stats
  const q2 = await prisma.question.create({
    data: {
      sessionId: session1.id,
      authorId: student1.id,
      content: "Why does fork() return twice?",
      isAnonymous: true,
      status: "ANSWERED",
      upvoteCount: 1,
      createdAt: WEEK1,
    },
  });
  await prisma.question.create({
    data: {
      sessionId: session2.id,
      authorId: student2.id,
      content: "How do pipes work?",
      status: "OPEN",
      upvoteCount: 0,
      createdAt: WEEK3,
    },
  });
  // Question in another course — must not appear in this course's analytics
  await prisma.question.create({
    data: {
      sessionId: otherSession.id,
      authorId: outsider.id,
      content: "What is 3NF?",
      createdAt: WEEK1,
    },
  });

  await prisma.answer.createMany({
    data: [
      {
        questionId: q1.id,
        authorId: ta.id,
        content: "A memory address.",
        upvoteCount: 2,
        createdAt: WEEK1,
      },
      {
        questionId: q2.id,
        authorId: ta.id,
        content: "Once in each process.",
        createdAt: WEEK1,
      },
      {
        questionId: q1.id,
        authorId: prof.id,
        content: "See lecture 2 slides.",
        createdAt: WEEK3,
      },
    ],
  });

  return { prof, ta, student1, student2, outsider, course, otherCourse };
}

describe("canViewCourseAnalytics", () => {
  it("allows enrolled professors and TAs, rejects students and non-members", async () => {
    const { prof, ta, student1, outsider, course } = await seed();
    expect(await canViewCourseAnalytics(prof.id, course.id)).toBe(true);
    expect(await canViewCourseAnalytics(ta.id, course.id)).toBe(true);
    expect(await canViewCourseAnalytics(student1.id, course.id)).toBe(false);
    expect(await canViewCourseAnalytics(outsider.id, course.id)).toBe(false);
  });
});

describe("getCourseAnalytics", () => {
  it("computes summary totals scoped to the course's sessions", async () => {
    const { course } = await seed();
    const { summary } = await getCourseAnalytics(course);

    expect(summary.totalQuestions).toBe(3); // other course's question excluded
    expect(summary.totalAnswers).toBe(3);
    expect(summary.activeParticipants).toBe(4); // student1, student2, ta, prof
    expect(summary.answeredRate).toBeCloseTo(2 / 3); // RESOLVED + ANSWERED of 3
  });

  it("breaks down participants with role tags and real anonymous attribution", async () => {
    const { course, student1, ta, prof } = await seed();
    const { participants } = await getCourseAnalytics(course);

    const s1 = participants.find((p) => p.userId === student1.id);
    expect(s1).toMatchObject({ role: "STUDENT", questionsAsked: 2, answersGiven: 0 });
    expect(s1?.upvotesReceived).toBe(4); // 3 + 1, anonymous question included

    const taRow = participants.find((p) => p.userId === ta.id);
    expect(taRow).toMatchObject({ role: "TA", questionsAsked: 0, answersGiven: 2 });
    expect(taRow?.upvotesReceived).toBe(2);

    const profRow = participants.find((p) => p.userId === prof.id);
    expect(profRow).toMatchObject({ role: "PROFESSOR", answersGiven: 1 });
  });

  it("buckets weekly engagement contiguously, reporting empty weeks as 0", async () => {
    const { course } = await seed();
    const { weekly } = await getCourseAnalytics(course);

    expect(weekly.map((w) => w.week)).toEqual([1, 2, 3]);
    expect(weekly[0]).toMatchObject({ weekStart: "2026-01-05", questions: 2, answers: 2 });
    expect(weekly[1]).toMatchObject({ weekStart: "2026-01-12", questions: 0, answers: 0 });
    expect(weekly[2]).toMatchObject({ weekStart: "2026-01-19", questions: 1, answers: 1 });
    expect(weekly[0].activeUsers).toBe(2); // student1 + ta
  });

  it("filters by from/to date range", async () => {
    const { course } = await seed();
    const { summary, participants } = await getCourseAnalytics(course, {
      from: new Date("2026-01-15T00:00:00.000Z"),
    });

    expect(summary.totalQuestions).toBe(1); // only the week-3 question
    expect(summary.totalAnswers).toBe(1); // only the prof's week-3 answer
    expect(participants.some((p) => p.questionsAsked === 2)).toBe(false);
  });

  it("returns an empty payload for a course with no sessions", async () => {
    const { prof } = await seed();
    const bare = await prisma.course.create({
      data: { code: "CSC108", name: "Intro", semester: "W26", createdById: prof.id },
    });
    const analytics = await getCourseAnalytics(bare);

    expect(analytics.summary.totalQuestions).toBe(0);
    expect(analytics.participants).toEqual([]);
    expect(analytics.weekly).toEqual([]);
  });
});

describe("week bucketing helpers", () => {
  it("startOfIsoWeek returns the Monday of the containing week", () => {
    expect(startOfIsoWeek(new Date("2026-01-07T15:30:00.000Z")).toISOString()).toBe(
      "2026-01-05T00:00:00.000Z"
    );
    // Sunday belongs to the week starting the previous Monday
    expect(startOfIsoWeek(new Date("2026-01-11T23:00:00.000Z")).toISOString()).toBe(
      "2026-01-05T00:00:00.000Z"
    );
    expect(startOfIsoWeek(new Date("2026-01-05T00:00:00.000Z")).toISOString()).toBe(
      "2026-01-05T00:00:00.000Z"
    );
  });

  it("fillWeeklyBuckets numbers weeks from the anchor and fills gaps", () => {
    const rows = [
      { weekStart: new Date("2026-01-12T00:00:00.000Z"), questions: 1, answers: 0, activeUsers: 1 },
      { weekStart: new Date("2026-01-26T00:00:00.000Z"), questions: 2, answers: 3, activeUsers: 2 },
    ];
    const weekly = fillWeeklyBuckets(rows, new Date("2026-01-05T00:00:00.000Z"));

    expect(weekly.map((w) => [w.week, w.weekStart, w.questions])).toEqual([
      [1, "2026-01-05", 0],
      [2, "2026-01-12", 1],
      [3, "2026-01-19", 0],
      [4, "2026-01-26", 2],
    ]);
  });

  it("fillWeeklyBuckets returns empty for no data", () => {
    expect(fillWeeklyBuckets([], new Date("2026-01-05T00:00:00.000Z"))).toEqual([]);
  });
});
