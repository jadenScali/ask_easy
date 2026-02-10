"use client";

import { useState } from "react";
import PLACEHOLDER_COMMENTS from "@/utils/placeholder";
import CommentNode from "./CommentNode";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import FilterTabs from "./FilterTabs";

export default function ClassChat() {
  const [commentView, setCommentView] = useState<"all" | "unresolved" | "resolved">("all");

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <ChatHeader />
      <div className="w-full px-4 py-2">
        <FilterTabs commentView={commentView} setCommentView={setCommentView} />
      </div>
      <div className="flex-1 overflow-y-auto px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-6">
            {PLACEHOLDER_COMMENTS.map((comment) => (
              <CommentNode key={comment.id} comment={comment} commentView={commentView} isRoot />
            ))}
          </div>
        </div>
      </div>

      <ChatInput />
    </div>
  );
}
