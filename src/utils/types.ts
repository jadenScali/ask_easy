"use client";

interface Comment {
  id: number;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  votes: number;
  replies?: Comment[];
  isResolved: boolean;
}

export default Comment;
