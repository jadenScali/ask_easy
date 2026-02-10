"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowBigUp, MessageCircle } from "lucide-react";
import Post, { Question, Answer } from "@/utils/types";

function renderAvatar(post: Post) {
  if (post) {
    return (
      <Avatar className="h-8 w-8">
        <AvatarImage src={post.avatar} alt={post.user} />
        <AvatarFallback>{post.user[0]}</AvatarFallback>
      </Avatar>
    );
  }
}

function renderUpvote(post: Post) {
  const votes = Math.max(0, post.votes);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-xs gap-2 text-stone-900/50 hover:text-stone-900 hover:bg-stone-200/50"
    >
      <ArrowBigUp className="h-4 w-4" />
      <span>{votes}</span>
    </Button>
  );
}

function renderReplyButton(
  isReplying: boolean,
  setIsReplying: React.Dispatch<React.SetStateAction<boolean>>
) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-xs gap-2 text-stone-900/50 hover:text-stone-900 hover:bg-stone-200/50"
      onClick={() => setIsReplying(!isReplying)}
    >
      <MessageCircle className="h-4 w-4" />
    </Button>
  );
}

function renderReplySection(setIsReplying: React.Dispatch<React.SetStateAction<boolean>>) {
  return (
    <div className="mt-2 pl-2">
      <Textarea placeholder="What are your thoughts?" className="min-h-[80px] mb-2" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setIsReplying(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => setIsReplying(false)}>
          Reply
        </Button>
      </div>
    </div>
  );
}

export default function CommentNode({ post, commentView }: { post: Post; commentView?: string }) {
  const [isReplying, setIsReplying] = useState(false);
  const isQuestion = post.type === "question";
  const [resolved, setResolved] = useState(isQuestion ? (post as Question).isResolved : false);

  if (isQuestion) {
    const question = post as Question;
    if (commentView === "unresolved" && question.isResolved) return null;
    if (commentView === "resolved" && !question.isResolved) return null;
  }

  if (isQuestion) {
    const question = post as Question;
    return (
      <div className="flex flex-col gap-2">
        <div className="font-bold whitespace-pre-wrap">{question.content}</div>

        <div className="flex items-center justify-between text-xs text-stone-900/50">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full cursor-pointer ${resolved ? "bg-green-500" : "bg-red-500"}`}
              onClick={() => setResolved(!resolved)}
            />
            <span className="font-semibold text-foreground">{question.user}</span>
            <span>{question.timestamp}</span>
          </div>
          <div className="flex items-center gap-2">
            {renderUpvote(question)}
            {renderReplyButton(isReplying, setIsReplying)}
          </div>
        </div>

        {(isReplying || (question.replies && question.replies.length > 0)) && (
          <div className="ml-1 pl-4 border-l border-border mt-2 space-y-4">
            {isReplying && renderReplySection(setIsReplying)}
            {question.replies &&
              question.replies.length > 0 &&
              question.replies
                .slice()
                .sort((a, b) => {
                  const aMain = a.type === "answer" && a.isMainAnswer;
                  const bMain = b.type === "answer" && b.isMainAnswer;
                  return aMain === bMain ? 0 : aMain ? -1 : 1;
                })
                .map((reply) => (
                  <CommentNode key={reply.id} post={reply} commentView={commentView} />
                ))}
          </div>
        )}
      </div>
    );
  }

  // Answer / Comment Render
  return (
    <div className="flex gap-3 mt-4">
      <div className="flex flex-col items-center gap-1">
        {renderAvatar(post)}
        <div className="h-full w-px bg-border my-2" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{post.user}</span>
          <span>{post.timestamp}</span>
          {post.type === "answer" && post.isMainAnswer && (
            <span className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-green-200">
              Main Answer
            </span>
          )}
        </div>

        <div
          className={`text-sm break-words whitespace-pre-wrap ${
            post.type === "answer" && post.isMainAnswer
              ? "p-3 bg-green-50/50 rounded-md border border-green-100 mt-1"
              : ""
          }`}
        >
          {post.content}
        </div>

        <div className="flex items-center gap-4 text-muted-foreground">{renderUpvote(post)}</div>
      </div>
    </div>
  );
}
