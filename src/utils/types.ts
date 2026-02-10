"use client";

export interface BasePost {
  id: number;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  votes: number;
}

export interface Answer extends BasePost {
  type: "answer";
  isMainAnswer?: boolean;
}

export interface Comment extends BasePost {
  type: "comment";
}

export interface Question extends BasePost {
  type: "question";
  replies: (Answer | Comment)[];
  isResolved: boolean;
}

export type Post = Question | Answer | Comment;

export default Post;
