"use client";

import { Question } from "./types";

const PLACEHOLDER_QUESTIONS: Question[] = [
  // Resolved Discussions
  {
    id: 1,
    type: "question",
    user: "Alex Chen",
    avatar: "",
    content:
      "I'm struggling with the difference between `useEffect` and `useLayoutEffect`. When should I use one over the other?",
    timestamp: "10:30",
    votes: 42,
    isResolved: true,
    replies: [
      {
        id: 101,
        type: "answer",
        user: "Sarah Jenkins",
        avatar: "",
        content:
          "99% of the time you want `useEffect`. only use `useLayoutEffect` if you need to measure DOM elements before they paint to avoid flickering.",
        timestamp: "10:45",
        votes: 156,
        isMainAnswer: true,
      },
    ],
  },
  {
    id: 2,
    type: "question",
    user: "Jordan Lee",
    avatar: "",
    content: "Is the midterm cumulative?",
    timestamp: "09:00",
    votes: 89,
    isResolved: true,
    replies: [
      {
        id: 201,
        type: "answer",
        user: "TA - Michael",
        avatar: "",
        content: "Yes, it covers everything from Week 1 to Week 6.",
        timestamp: "10:00",
        votes: 210,
        isMainAnswer: true,
      },
    ],
  },

  // Unresolved Discussions
  {
    id: 3,
    type: "question",
    user: "Jamie Rivera",
    avatar: "",
    content:
      "I thought I understood recursion until the prof said 'it just calls itself' and moved on like that explained everything.",
    timestamp: "11:45",
    votes: 124,
    isResolved: false,
    replies: [
      {
        id: 301,
        type: "comment",
        user: "Alice Wonder",
        avatar: "",
        content:
          "The base case makes sense. The recursive step makes sense. Them together? Absolutely not.",
        timestamp: "12:45",
        votes: 54,
      },
      {
        id: 3011,
        type: "comment",
        user: "Bob Builder",
        avatar: "",
        content:
          "My program works without recursion, but the assignment says I *must* use it, so now it doesn't work at all.",
        timestamp: "13:00",
        votes: 31,
      },
      {
        id: 302,
        type: "comment",
        user: "Professor Snape",
        avatar: "",
        content: "Turn to page 394.",
        timestamp: "13:35",
        votes: 0,
      },
    ],
  },
  {
    id: 4,
    type: "question",
    user: "Chris Pat",
    avatar: "",
    content:
      "Does anyone have good resources for learning Dynamic Programming? The leetcode problems are killing me.",
    timestamp: "13:15",
    votes: 15,
    isResolved: false,
    replies: [
      {
        id: 401,
        type: "comment",
        user: "Dev Guru",
        avatar: "",
        content: "Check out the 'Climbing Stairs' problem first. It's the classic intro.",
        timestamp: "13:30",
        votes: 8,
      },
    ],
  },
];

export default PLACEHOLDER_QUESTIONS;
