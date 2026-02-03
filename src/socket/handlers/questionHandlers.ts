import { type Server, type Socket } from "socket.io";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { questionRateLimit } from "@/lib/redisKeys";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUESTION_MIN_LENGTH = 5;
const QUESTION_MAX_LENGTH = 500;

const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

const VALID_VISIBILITIES = new Set<string>(["PUBLIC", "INSTRUCTOR_ONLY"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuestionCreatePayload {
  content: string;
  sessionId: string;
  visibility?: "PUBLIC" | "INSTRUCTOR_ONLY";
  isAnonymous?: boolean;
  slideId?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface QuestionBroadcastPayload {
  id: string;
  content: string;
  visibility: string;
  isAnonymous: boolean;
  slideId: string | null;
  createdAt: Date;
  authorId?: string | null;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Validates question content.
 * Checks that content is a non-empty string within the allowed length bounds.
 */
export function validateQuestionContent(content: unknown): ValidationResult {
  if (!content || typeof content !== "string") {
    return { valid: false, error: "Question content is required." };
  }

  const trimmed = content.trim();

  if (trimmed.length < QUESTION_MIN_LENGTH) {
    return { valid: false, error: `Question must be at least ${QUESTION_MIN_LENGTH} characters.` };
  }

  if (trimmed.length > QUESTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `Question must be no more than ${QUESTION_MAX_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

/**
 * Checks whether the given user has exceeded the question rate limit
 * (10 questions per 60-second window).
 * Returns true if the limit has been exceeded.
 */
export async function checkQuestionRateLimit(userId: string): Promise<boolean> {
  return checkRateLimit(questionRateLimit(userId), RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW_SECONDS);
}

/**
 * Broadcasts a newly created question to the appropriate session room.
 *
 * Room conventions (populated when users join a session):
 *   session:{sessionId}            — every participant
 *   session:{sessionId}:instructors — TAs and professors only
 *
 * PUBLIC questions go to the first room; INSTRUCTOR_ONLY questions go to the second.
 */
export function broadcastQuestion(
  io: Server,
  sessionId: string,
  question: QuestionBroadcastPayload
): void {
  const targetRoom =
    question.visibility === "INSTRUCTOR_ONLY"
      ? `session:${sessionId}:instructors`
      : `session:${sessionId}`;

  io.to(targetRoom).emit("question:created", question);
}

/**
 * Registers the `question:create` event listener on the given socket.
 *
 * Guard order (cheap-before-expensive):
 *   1. Auth          — socket.data.userId must exist (set by auth middleware)
 *   2. Payload shape — must be a non-null object
 *   3. Content       — length bounds via validateQuestionContent
 *   4. Visibility    — must be a recognised Visibility value if provided
 *   5. Rate limit    — 10 questions / 60 s per user, enforced in Redis
 *   6. Session       — must exist in the DB and have isSubmissionsEnabled === true
 *   7. Persist       — question written to the database (authorId always stored)
 *   8. Broadcast     — emitted to the correct room; authorId stripped when anonymous
 */
export function handleQuestionCreate(socket: Socket, io: Server): void {
  socket.on("question:create", async (payload: QuestionCreatePayload) => {
    try {
      // 1. Auth guard — userId is attached by socket auth middleware
      const userId: string | undefined = socket.data?.userId;
      if (!userId) {
        socket.emit("question:error", { message: "Authentication required." });
        return;
      }

      // 2. Payload shape guard — socket events can arrive with any shape
      if (!payload || typeof payload !== "object") {
        socket.emit("question:error", { message: "Invalid request." });
        return;
      }

      // 3. Content validation
      const validation = validateQuestionContent(payload.content);
      if (!validation.valid) {
        socket.emit("question:error", { message: validation.error });
        return;
      }

      // 4. Visibility validation — reject unknown values before they reach Prisma
      if (payload.visibility && !VALID_VISIBILITIES.has(payload.visibility)) {
        socket.emit("question:error", { message: "Invalid visibility setting." });
        return;
      }

      // 5. Rate limit (first async check — only reached if all sync checks pass)
      const isRateLimited = await checkQuestionRateLimit(userId);
      if (isRateLimited) {
        socket.emit("question:error", {
          message: "You have reached the question limit. Please wait before asking another question.",
        });
        return;
      }

      // 6. Session validation
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session) {
        socket.emit("question:error", { message: "Session not found." });
        return;
      }

      if (!session.isSubmissionsEnabled) {
        socket.emit("question:error", {
          message: "Question submissions are currently disabled.",
        });
        return;
      }

      // 7. Persist to database
      //    authorId is always stored for audit purposes, but it is stripped
      //    from the broadcast payload in step 8 when isAnonymous is true.
      const question = await prisma.question.create({
        data: {
          sessionId: payload.sessionId,
          authorId: userId,
          content: payload.content.trim(),
          visibility: payload.visibility ?? "PUBLIC",
          isAnonymous: payload.isAnonymous ?? false,
          slideId: payload.slideId ?? null,
        },
      });

      // 8. Build broadcast payload and emit to the session room
      const broadcastPayload: QuestionBroadcastPayload = {
        id: question.id,
        content: question.content,
        visibility: question.visibility,
        isAnonymous: question.isAnonymous,
        slideId: question.slideId,
        createdAt: question.createdAt,
        ...(question.isAnonymous ? {} : { authorId: question.authorId }),
      };

      broadcastQuestion(io, question.sessionId, broadcastPayload);
    } catch (error) {
      console.error("[QuestionHandler] Failed to create question:", error);
      socket.emit("question:error", {
        message: "An error occurred while creating your question.",
      });
    }
  });
}
