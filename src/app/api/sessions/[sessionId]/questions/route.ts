import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { questionRateLimit } from "@/lib/redisKeys";

// ---------------------------------------------------------------------------
// Constants (matching socket handler)
// ---------------------------------------------------------------------------

const QUESTION_MIN_LENGTH = 5;
const QUESTION_MAX_LENGTH = 500;
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

const VALID_VISIBILITIES = new Set(["PUBLIC", "INSTRUCTOR_ONLY"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

interface QuestionCreateBody {
  content: string;
  authorId: string; // Required for REST API (no socket auth)
  visibility?: "PUBLIC" | "INSTRUCTOR_ONLY";
  isAnonymous?: boolean;
  slideId?: string;
}

// ---------------------------------------------------------------------------
// GET /api/sessions/[sessionId]/questions
// ---------------------------------------------------------------------------

/**
 * Retrieves all questions for a given session.
 *
 * Query parameters:
 *   - visibility: "PUBLIC" | "INSTRUCTOR_ONLY" (optional filter)
 *   - status: "OPEN" | "ANSWERED" | "RESOLVED" (optional filter)
 *
 * Returns questions ordered by createdAt descending (newest first).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    // Validate session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    // Parse optional query parameters for filtering
    const { searchParams } = new URL(request.url);
    const visibility = searchParams.get("visibility");
    const status = searchParams.get("status");

    // Build dynamic where clause
    const where: {
      sessionId: string;
      visibility?: "PUBLIC" | "INSTRUCTOR_ONLY";
      status?: "OPEN" | "ANSWERED" | "RESOLVED";
    } = { sessionId };

    if (visibility === "PUBLIC" || visibility === "INSTRUCTOR_ONLY") {
      where.visibility = visibility;
    }

    if (status === "OPEN" || status === "ANSWERED" || status === "RESOLVED") {
      where.status = status;
    }

    // Fetch questions with author info (respecting anonymity)
    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { answers: true },
        },
      },
    });

    // Transform response to respect anonymity
    const transformedQuestions = questions.map((q) => ({
      id: q.id,
      content: q.content,
      visibility: q.visibility,
      status: q.status,
      isAnonymous: q.isAnonymous,
      upvoteCount: q.upvoteCount,
      answerCount: q._count.answers,
      slideId: q.slideId,
      createdAt: q.createdAt,
      // Only include author info if not anonymous
      author: q.isAnonymous ? null : q.author,
    }));

    return NextResponse.json({
      sessionId,
      questions: transformedQuestions,
      count: transformedQuestions.length,
    });
  } catch (error) {
    console.error("[Questions API] Failed to fetch questions:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching questions." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/sessions/[sessionId]/questions
// ---------------------------------------------------------------------------

/**
 * Creates a new question in the given session.
 *
 * Request body:
 *   - content: string (required, 5-500 characters)
 *   - authorId: string (required)
 *   - visibility: "PUBLIC" | "INSTRUCTOR_ONLY" (optional, defaults to PUBLIC)
 *   - isAnonymous: boolean (optional, defaults to false)
 *   - slideId: string (optional)
 *
 * Validations:
 *   1. Content length bounds
 *   2. Visibility is valid if provided
 *   3. Rate limit (10 questions per 60 seconds per user)
 *   4. Session exists and has submissions enabled
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    // Parse request body
    let body: QuestionCreateBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // 1. Validate authorId is provided
    if (!body.authorId || typeof body.authorId !== "string") {
      return NextResponse.json({ error: "Author ID is required." }, { status: 400 });
    }

    // 2. Validate content
    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json({ error: "Question content is required." }, { status: 400 });
    }

    const trimmedContent = body.content.trim();

    if (trimmedContent.length < QUESTION_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Question must be at least ${QUESTION_MIN_LENGTH} characters.` },
        { status: 400 }
      );
    }

    if (trimmedContent.length > QUESTION_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Question must be no more than ${QUESTION_MAX_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // 3. Validate visibility if provided
    if (body.visibility && !VALID_VISIBILITIES.has(body.visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility setting. Must be PUBLIC or INSTRUCTOR_ONLY." },
        { status: 400 }
      );
    }

    // 4. Check rate limit
    const isRateLimited = await checkRateLimit(
      questionRateLimit(body.authorId),
      RATE_LIMIT_COUNT,
      RATE_LIMIT_WINDOW_SECONDS
    );

    if (isRateLimited) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before asking another question." },
        { status: 429 }
      );
    }

    // 5. Validate session exists and has submissions enabled
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (!session.isSubmissionsEnabled) {
      return NextResponse.json(
        { error: "Question submissions are currently disabled for this session." },
        { status: 403 }
      );
    }

    // 6. Create the question
    const question = await prisma.question.create({
      data: {
        sessionId,
        authorId: body.authorId,
        content: trimmedContent,
        visibility: body.visibility ?? "PUBLIC",
        isAnonymous: body.isAnonymous ?? false,
        slideId: body.slideId ?? null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 7. Return the created question (respecting anonymity)
    return NextResponse.json(
      {
        id: question.id,
        content: question.content,
        visibility: question.visibility,
        status: question.status,
        isAnonymous: question.isAnonymous,
        upvoteCount: question.upvoteCount,
        slideId: question.slideId,
        createdAt: question.createdAt,
        author: question.isAnonymous ? null : question.author,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Questions API] Failed to create question:", error);
    return NextResponse.json(
      { error: "An error occurred while creating your question." },
      { status: 500 }
    );
  }
}
