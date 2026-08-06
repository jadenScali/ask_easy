import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  checkSessionJoinLookupRateLimit,
  checkSessionJoinRegisterRateLimit,
} from "@/lib/sessionJoinValidation";
import { lookupSessionByCode, joinSession } from "@/lib/sessionJoin";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/sessions/join/[code]
 *
 * Looks up a session by join code (case-insensitive).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { code } = await params;

    if (await checkSessionJoinLookupRateLimit(user.userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before looking up another session." },
        { status: 429 }
      );
    }

    const result = await lookupSessionByCode(code);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 });
    }

    return NextResponse.json({ session: result.session });
  } catch (error) {
    console.error("[Session Join API] Failed to lookup session:", error);
    return NextResponse.json(
      { error: "An error occurred while looking up the session." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/join/[code]
 *
 * Joins a session by creating a CourseEnrollment for the session's course.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { code } = await params;

    if (await checkSessionJoinRegisterRateLimit(user.userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before joining another session." },
        { status: 429 }
      );
    }

    const result = await joinSession(code, user.userId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 });
    }

    return NextResponse.json(
      { enrollment: result.enrollment, session: result.session },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Session Join API] Failed to join session:", error);
    return NextResponse.json(
      { error: "An error occurred while joining the session." },
      { status: 500 }
    );
  }
}
