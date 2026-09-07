import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma";
import { getCourseRoles } from "@/lib/sessionService";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GetAnswersOptions {
  cursor?: string;
  limit?: number;
}

export interface AnswerAuthor {
  id: string;
  utorid: string;
  name: string;
  role: Role;
}

export interface AnswerResponse {
  id: string;
  questionId: string;
  content: string;
  author: AnswerAuthor | null;
  authorRole: Role;
  isAccepted: boolean;
  isAnonymous: boolean;
  upvoteCount: number;
  createdAt: Date;
  /** True for the requesting user's own answer, even when anonymity hides them. */
  isMine: boolean;
}

export interface GetAnswersResult {
  answers: AnswerResponse[];
  nextCursor: string | null;
  acceptedAnswerId: string | null;
}

export interface GetAnswerByIdResult {
  answer: AnswerResponse;
  questionId: string;
}

export interface ServiceError {
  status: number;
  message: string;
}

type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the requesting user's role within the course that owns the
 * question's session. Returns `null` if the user is not enrolled.
 */
async function getUserCourseRole(userId: string, courseId: string): Promise<Role | null> {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { role: true },
  });
  return enrollment?.role ?? null;
}

/**
 * Returns `true` when the caller's enrollment role allows them to see the
 * identity behind anonymous content.
 */
function canRevealAnonymous(role: Role): boolean {
  return role === "TA" || role === "PROFESSOR";
}

/**
 * Shapes an answer for the wire: strips author identity when it should be
 * hidden from the requesting user, and reports the author's per-course role.
 *
 * `courseRole` comes from CourseEnrollment and wins over the author's global
 * `User.role`, which stays STUDENT for someone who is a TA in this course.
 */
function toAnswerResponse(
  answer: {
    id: string;
    questionId: string;
    content: string;
    isAnonymous: boolean;
    isAccepted: boolean;
    upvoteCount: number;
    createdAt: Date;
    author: { id: string; utorid: string; name: string; role: Role };
  },
  viewerCanReveal: boolean,
  viewerId: string,
  courseRole: Role | undefined
): AnswerResponse {
  const hideAuthor = answer.isAnonymous && !viewerCanReveal;
  const role = courseRole ?? answer.author.role;

  return {
    id: answer.id,
    questionId: answer.questionId,
    content: answer.content,
    author: hideAuthor
      ? null
      : {
          id: answer.author.id,
          utorid: answer.author.utorid,
          name: answer.author.name,
          role,
        },
    authorRole: role,
    isAccepted: answer.isAccepted,
    isAnonymous: answer.isAnonymous,
    upvoteCount: answer.upvoteCount,
    createdAt: answer.createdAt,
    isMine: answer.author.id === viewerId,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches answers for a question with cursor-based pagination.
 *
 * Access rules:
 *   - User must be enrolled in the course that owns the session.
 *   - Students cannot view answers on INSTRUCTOR_ONLY questions.
 *
 * Sorting: accepted first, then by createdAt ascending, then by id ascending
 * (tie-breaker for stable pagination).
 *
 * Anonymity: anonymous answer authors are hidden from students; TAs and
 * professors can always see author identity.
 */
export async function getQuestionAnswers(
  questionId: string,
  userId: string,
  options: GetAnswersOptions = {}
): Promise<ServiceResult<GetAnswersResult>> {
  // ---- Validate question exists and load its context -----------------------
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      visibility: true,
      session: {
        select: {
          id: true,
          courseId: true,
        },
      },
    },
  });

  if (!question) {
    return { ok: false, error: { status: 404, message: "Question not found." } };
  }

  // ---- Enrollment check ----------------------------------------------------
  const viewerRole = await getUserCourseRole(userId, question.session.courseId);

  if (!viewerRole) {
    return {
      ok: false,
      error: { status: 403, message: "You are not enrolled in this course." },
    };
  }

  // ---- Visibility check ----------------------------------------------------
  if (question.visibility === "INSTRUCTOR_ONLY" && viewerRole === "STUDENT") {
    return {
      ok: false,
      error: {
        status: 403,
        message: "You do not have permission to view this question.",
      },
    };
  }

  // ---- Pagination setup ----------------------------------------------------
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

  // Fetch one extra to determine if there's a next page
  const take = limit + 1;

  const cursorClause: Record<string, unknown> | undefined = options.cursor
    ? { cursor: { id: options.cursor }, skip: 1 }
    : undefined;

  // ---- Query answers -------------------------------------------------------
  const answers = await prisma.answer.findMany({
    where: { questionId },
    orderBy: [{ isAccepted: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    take,
    ...cursorClause,
    select: {
      id: true,
      questionId: true,
      content: true,
      isAnonymous: true,
      isAccepted: true,
      upvoteCount: true,
      createdAt: true,
      author: {
        select: { id: true, utorid: true, name: true, role: true },
      },
    },
  });

  // ---- Determine pagination cursor -----------------------------------------
  const hasMore = answers.length > limit;
  if (hasMore) answers.pop();

  const nextCursor = hasMore ? answers[answers.length - 1].id : null;

  // ---- Find accepted answer id (across all pages) --------------------------
  const acceptedAnswer = await prisma.answer.findFirst({
    where: { questionId, isAccepted: true },
    select: { id: true },
  });

  // ---- Redact anonymous authors for students -------------------------------
  const viewerCanReveal = canRevealAnonymous(viewerRole);
  const courseRoles = await getCourseRoles(
    question.session.courseId,
    answers.map((a) => a.author.id)
  );

  const transformed: AnswerResponse[] = answers.map((a) =>
    toAnswerResponse(a, viewerCanReveal, userId, courseRoles.get(a.author.id))
  );

  return {
    ok: true,
    data: {
      answers: transformed,
      nextCursor,
      acceptedAnswerId: acceptedAnswer?.id ?? null,
    },
  };
}

/**
 * Fetches a single answer by id.
 *
 * Applies the same enrollment and visibility checks as `getQuestionAnswers`.
 */
export async function getAnswerById(
  answerId: string,
  userId: string
): Promise<ServiceResult<GetAnswerByIdResult>> {
  const answer = await prisma.answer.findUnique({
    where: { id: answerId },
    select: {
      id: true,
      questionId: true,
      content: true,
      isAnonymous: true,
      isAccepted: true,
      upvoteCount: true,
      createdAt: true,
      author: {
        select: { id: true, utorid: true, name: true, role: true },
      },
      question: {
        select: {
          id: true,
          visibility: true,
          session: {
            select: { courseId: true },
          },
        },
      },
    },
  });

  if (!answer) {
    return { ok: false, error: { status: 404, message: "Answer not found." } };
  }

  // ---- Enrollment check ----------------------------------------------------
  const viewerRole = await getUserCourseRole(userId, answer.question.session.courseId);

  if (!viewerRole) {
    return {
      ok: false,
      error: { status: 403, message: "You are not enrolled in this course." },
    };
  }

  // ---- Visibility check on parent question ---------------------------------
  if (answer.question.visibility === "INSTRUCTOR_ONLY" && viewerRole === "STUDENT") {
    return {
      ok: false,
      error: {
        status: 403,
        message: "You do not have permission to view this answer.",
      },
    };
  }

  const viewerCanReveal = canRevealAnonymous(viewerRole);
  const authorRole = await getUserCourseRole(answer.author.id, answer.question.session.courseId);

  return {
    ok: true,
    data: {
      answer: toAnswerResponse(answer, viewerCanReveal, userId, authorRole ?? undefined),
      questionId: answer.questionId,
    },
  };
}
