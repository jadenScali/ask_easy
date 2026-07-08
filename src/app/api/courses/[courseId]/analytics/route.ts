import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewCourseAnalytics, getCourseAnalytics } from "@/lib/courseAnalytics";
import { validateAnalyticsRange } from "@/lib/analyticsValidation";

interface RouteParams {
  params: Promise<{ courseId: string }>;
}

// ---------------------------------------------------------------------------
// GET /api/courses/[courseId]/analytics
// ---------------------------------------------------------------------------

/**
 * Returns engagement analytics for a course: summary totals, per-participant
 * contribution stats (role-tagged), and a weekly engagement time series.
 *
 * Query params (all optional, ISO dates):
 *   - from / to:  restrict the range (from <= to)
 *   - weekStart:  anchor for week numbering (default: earliest session start)
 *
 * Only instructors (PROFESSOR or TA) enrolled in the course may call this.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { courseId } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, code: true, name: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (!(await canViewCourseAnalytics(user.userId, courseId))) {
      return NextResponse.json(
        { error: "Only instructors of this course can view analytics." },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const range = validateAnalyticsRange(
      searchParams.get("from"),
      searchParams.get("to"),
      searchParams.get("weekStart")
    );
    if (!range.valid) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }

    const analytics = await getCourseAnalytics(course, {
      from: range.from,
      to: range.to,
      weekStart: range.weekStart,
    });

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[Courses API] Failed to compute analytics:", error);
    return NextResponse.json({ error: "An error occurred." }, { status: 500 });
  }
}
