import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(cleanup);

import ChatHeader from "@/app/room/classChat/ChatHeader";
import { stripAuthors } from "@/app/room/classChat/post/PostUtils";
import type { Question, Role } from "@/utils/types";

// ---------------------------------------------------------------------------
// stripAuthors — projection mode anonymization
// ---------------------------------------------------------------------------

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    type: "question",
    user: { id: "u1", utorid: "student1", username: "Student One", pfp: "", role: "STUDENT" },
    timestamp: "10:00 AM",
    content: "What is a pointer?",
    upvotes: 3,
    isResolved: false,
    isAnonymous: false,
    replies: [
      {
        id: "a1",
        type: "comment",
        user: { id: "u2", utorid: "ta1", username: "TA One", pfp: "", role: "TA" },
        timestamp: "10:01 AM",
        content: "A memory address.",
        upvotes: 1,
        isAnonymous: false,
      },
    ],
    visibility: "PUBLIC",
    ...overrides,
  };
}

describe("stripAuthors", () => {
  it("keeps authors of publicly-attributed questions and replies", () => {
    const stripped = stripAuthors([makeQuestion()]);
    expect(stripped[0].user?.username).toBe("Student One");
    expect(stripped[0].replies[0].user?.username).toBe("TA One");
  });

  it("hides authors of anonymous questions and replies", () => {
    const anon = makeQuestion({
      isAnonymous: true,
      replies: [
        {
          id: "a1",
          type: "comment",
          user: { id: "u2", utorid: "s2", username: "Student Two", pfp: "", role: "STUDENT" },
          timestamp: "10:01 AM",
          content: "me too",
          upvotes: 0,
          isAnonymous: true,
        },
      ],
    });
    const stripped = stripAuthors([anon]);
    expect(stripped[0].user).toBeNull();
    expect(stripped[0].replies[0].user).toBeNull();
  });

  it("strips revealed anonymous authors too", () => {
    // Simulates a question whose author arrived via question:author:revealed
    const revealed = makeQuestion({
      isAnonymous: true,
      user: { id: "u9", utorid: "revealed1", username: "Revealed Name", pfp: "", role: "STUDENT" },
    });
    const stripped = stripAuthors([revealed]);
    expect(stripped[0].user).toBeNull();
  });

  it("preserves content, upvotes, and resolution state", () => {
    const stripped = stripAuthors([makeQuestion({ isResolved: true })]);
    expect(stripped[0].content).toBe("What is a pointer?");
    expect(stripped[0].upvotes).toBe(3);
    expect(stripped[0].isResolved).toBe(true);
    expect(stripped[0].replies[0].content).toBe("A memory address.");
  });

  it("does not mutate the original questions", () => {
    const original = makeQuestion();
    stripAuthors([original]);
    expect(original.user?.username).toBe("Student One");
    expect(original.replies[0].user?.username).toBe("TA One");
  });
});

// ---------------------------------------------------------------------------
// ChatHeader — toggle visibility and behaviour
// ---------------------------------------------------------------------------

function renderHeader(role: Role, projectionMode = true, onToggle = vi.fn()) {
  render(
    <ChatHeader
      role={role}
      answerMode="instructors_only"
      onToggleAnswerMode={vi.fn()}
      projectionMode={projectionMode}
      onToggleProjectionMode={onToggle}
      searchQuery=""
      onSearchChange={vi.fn()}
    />
  );
  return onToggle;
}

const TOGGLE_LABEL = "Toggle name visibility";

describe("ChatHeader projection mode toggle", () => {
  it("is visible to professors", () => {
    renderHeader("PROFESSOR");
    expect(screen.getByLabelText(TOGGLE_LABEL)).toBeDefined();
  });

  it("is visible to TAs", () => {
    renderHeader("TA");
    expect(screen.getByLabelText(TOGGLE_LABEL)).toBeDefined();
  });

  it("is not rendered for students", () => {
    renderHeader("STUDENT");
    expect(screen.queryByLabelText(TOGGLE_LABEL)).toBeNull();
  });

  it("reflects the projection state with the eye icon", () => {
    renderHeader("PROFESSOR", true);
    expect(
      screen.getByLabelText(TOGGLE_LABEL).querySelector("svg")?.getAttribute("class")
    ).toContain("lucide-eye-off");
    cleanup();
    renderHeader("PROFESSOR", false);
    const cls =
      screen.getByLabelText(TOGGLE_LABEL).querySelector("svg")?.getAttribute("class") ?? "";
    expect(cls).toContain("lucide-eye");
    expect(cls).not.toContain("lucide-eye-off");
  });

  it("calls the toggle callback on click", () => {
    const onToggle = renderHeader("PROFESSOR");
    fireEvent.click(screen.getByLabelText(TOGGLE_LABEL));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
