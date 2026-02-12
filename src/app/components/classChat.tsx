"use client";

import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowBigUp, CheckCircle2 } from "lucide-react";
import { io, Socket } from "socket.io-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Question {
  id: string;
  content: string;
  visibility: string;
  status: string;
  isAnonymous: boolean;
  upvoteCount: number;
  answerCount: number;
  slideId: string | null;
  createdAt: string;
  author: { id: string; name: string } | null;
}

interface SessionInfo {
  id: string;
  title: string;
  joinCode: string;
  course: { code: string; name: string };
}

interface UserInfo {
  id: string;
  name: string;
  role: string;
  utorid: string;
}

// ---------------------------------------------------------------------------
// QuestionCard
// ---------------------------------------------------------------------------

const QuestionCard: React.FC<{
  question: Question;
  onUpvote: (id: string) => void;
  onResolve: (id: string) => void;
}> = ({ question, onUpvote, onResolve }) => {
  const authorName = question.isAnonymous ? "Anonymous" : (question.author?.name ?? "Unknown");

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-500/10 text-blue-500",
    ANSWERED: "bg-yellow-500/10 text-yellow-500",
    RESOLVED: "bg-green-500/10 text-green-500",
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center gap-1">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{authorName[0]}</AvatarFallback>
        </Avatar>
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{authorName}</span>
          <span>&bull;</span>
          <span>{new Date(question.createdAt).toLocaleTimeString()}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[question.status] ?? ""}`}
          >
            {question.status}
          </span>
          {question.visibility === "INSTRUCTOR_ONLY" && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-500">
              INSTRUCTOR ONLY
            </span>
          )}
        </div>

        <div className="text-sm">{question.content}</div>

        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-orange-500"
              onClick={() => onUpvote(question.id)}
            >
              <ArrowBigUp className="h-5 w-5" />
            </Button>
            <span className="text-xs font-bold">{question.upvoteCount}</span>
          </div>

          {question.status !== "RESOLVED" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1 hover:bg-green-500/10 hover:text-green-500"
              onClick={() => onResolve(question.id)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Resolve
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ClassChat
// ---------------------------------------------------------------------------

const ClassChat: React.FC = () => {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);

  // Fetch sessions and users on mount
  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => {
        if (data.sessions?.[0]) setSession(data.sessions[0]);
      })
      .catch(console.error);

    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.users?.length) {
          setUsers(data.users);
          setSelectedUserId(data.users[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch questions when session loads
  useEffect(() => {
    if (!session) return;
    fetch(`/api/sessions/${session.id}/questions`)
      .then((r) => r.json())
      .then((data) => {
        if (data.questions) setQuestions(data.questions);
      })
      .catch(console.error);
  }, [session]);

  // Connect socket when user is selected
  useEffect(() => {
    if (!selectedUserId) return;

    socketRef.current?.disconnect();

    const socket = io({ auth: { userId: selectedUserId } });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      if (session) {
        socket.emit("session:join", { sessionId: session.id });
      }
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("question:updated", (payload) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === payload.id ? { ...q, upvoteCount: payload.upvoteCount } : q))
      );
    });

    socket.on("question:resolved", (payload) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === payload.id ? { ...q, status: payload.status } : q))
      );
    });

    socket.on("question:created", (payload) => {
      setQuestions((prev) => [
        {
          id: payload.id,
          content: payload.content,
          visibility: payload.visibility,
          status: "OPEN",
          isAnonymous: payload.isAnonymous,
          upvoteCount: 0,
          answerCount: 0,
          slideId: payload.slideId,
          createdAt: String(payload.createdAt),
          author: null,
        },
        ...prev,
      ]);
    });

    socket.on("question:error", (payload) => {
      setError(payload.message);
      setTimeout(() => setError(""), 3000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedUserId, session]);

  const handleUpvote = (questionId: string) => {
    socketRef.current?.emit("question:upvote", { questionId });
  };

  const handleResolve = (questionId: string) => {
    socketRef.current?.emit("question:resolve", { questionId });
  };

  const handlePostQuestion = () => {
    if (!socketRef.current || !session || !newQuestion.trim()) return;
    socketRef.current.emit("question:create", {
      content: newQuestion.trim(),
      sessionId: session.id,
    });
    setNewQuestion("");
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
        <h1 className="text-xl font-bold">Class Discussion</h1>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <select
            className="text-sm bg-muted rounded px-2 py-1 border"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Error Banner */}
      {error && <div className="bg-red-500/10 text-red-500 text-sm px-6 py-2">{error}</div>}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {session ? (
            <Card className="p-6 mb-8 border-muted bg-muted/20">
              <h2 className="text-2xl font-bold mb-2">{session.course.code}</h2>
              <p className="text-muted-foreground mb-4">
                {session.title} &bull; Code: {session.joinCode}
              </p>
            </Card>
          ) : (
            <Card className="p-6 mb-8 border-muted bg-muted/20">
              <p className="text-muted-foreground">Loading session...</p>
            </Card>
          )}

          <div className="space-y-6">
            {questions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No questions yet. Be the first to ask!
              </p>
            ) : (
              questions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  onUpvote={handleUpvote}
                  onResolve={handleResolve}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Question Input */}
      <div className="border-t bg-background p-4 relative z-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4">
            <Textarea
              placeholder="Ask a question..."
              className="min-h-[60px]"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePostQuestion();
                }
              }}
            />
            <Button className="h-auto" onClick={handlePostQuestion}>
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassChat;
