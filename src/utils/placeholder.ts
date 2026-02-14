import { Post, Course, User } from "./types";

export const PLACEHOLDER_POSTS: Post[] = [
  // Resolved Question: Pointers
  {
    id: 1,
    type: "question",
    user: {
      username: "Hairy PotterHairy",
      pfp: "",
      role: "student",
    },
    timestamp: "09:15",
    content: "What is the specific difference between *p and &p? I keep mixing them up.",
    upvotes: 12,
    isResolved: true,
    replies: [
      {
        id: 2,
        type: "bestAnswer",
        user: {
          username: "Snape Malfoy",
          pfp: "",
          role: "prof",
        },
        timestamp: "09:18",
        content:
          "Think of p as the variable itself, &p as the address in memory, and *p as the value stored at that address.",
        upvotes: 45,
      },
      {
        id: 3,
        type: "comment",
        user: {
          username: "Jack Jones",
          pfp: "",
          role: "ta",
        },
        timestamp: "09:25",
        content: "Just remember: & is Address, * is Value.",
        upvotes: 5,
      },
      {
        id: 4,
        type: "comment",
        user: {
          username: "Johnny Beans",
          pfp: "",
          role: "student",
        },
        timestamp: "09:28",
        content: "That makes sense now. Thanks!",
        upvotes: 2,
      },
    ],
  },

  // Conceptual Question: Stack vs Heap
  {
    id: 5,
    type: "question",
    user: {
      username: "Lily Thompson James Arron Jack Jesse James North East West South",
      pfp: "",
      role: "student",
    },
    timestamp: "11:20",
    content: "What is the actual difference between stack and heap memory? They seem similar.",
    upvotes: 8,
    isResolved: false,
    replies: [
      {
        id: 6,
        type: "comment",
        user: {
          username: "Jesse Retger",
          pfp: "",
          role: "student",
        },
        timestamp: "11:24",
        content: "I think they're the same thing?",
        upvotes: 0,
      },
    ],
  },

  // Discussion: Macro vs Const
  {
    id: 8,
    type: "question",
    user: {
      username: "Birdi McFly",
      pfp: "",
      role: "student",
    },
    timestamp: "14:05",
    content: "Why do we use #define for array sizes instead of const int?",
    upvotes: 7,
    isResolved: false,
    replies: [
      {
        id: 9,
        type: "comment",
        user: {
          username: "Albert Einstein",
          pfp: "",
          role: "student",
        },
        timestamp: "14:10",
        content: "No clue.",
        upvotes: 15,
      },
      {
        id: 10,
        type: "comment",
        user: {
          username: "Kesha Sharma",
          pfp: "",
          role: "prof",
        },
        timestamp: "14:15",
        content:
          "I recommend const for type safety when possible not sure why it just works most of the time, but #define is very common.",
        upvotes: 20,
      },
    ],
  },

  // Resolved Question: Semicolons (New)
  {
    id: 11,
    type: "question",
    user: {
      username: "Jack Anaconda",
      pfp: "",
      role: "student",
    },
    timestamp: "16:20",
    content: "I'm coming from Python. What are the semicolons for? They seem useless.",
    upvotes: 2,
    isResolved: true,
    replies: [
      {
        id: 12,
        type: "bestAnswer",
        user: {
          username: "Snape Malfoy",
          pfp: "",
          role: "prof",
        },
        timestamp: "16:21",
        content:
          "In C, whitespace doesn't matter. The semicolon tells the compiler exactly where the command ends.",
        upvotes: 18,
      },
      {
        id: 13,
        type: "comment",
        user: {
          username: "Jack Anaconda",
          pfp: "",
          role: "student",
        },
        timestamp: "16:25",
        content: "Wait, so I can write code on one line?",
        upvotes: 1,
      },
      {
        id: 14,
        type: "comment",
        user: {
          username: "Joyce Chu",
          pfp: "",
          role: "ta",
        },
        timestamp: "16:26",
        content: "Yes, but please don't.",
        upvotes: 30,
      },
    ],
  },
];

export const PLACEHOLDER_COURSES: Course[] = [
  {
    id: 1,
    name: "Introduction to Physics",
    professor: "Dr. Emily Carter",
    beginDate: "2026-01-10",
    endDate: "2026-04-20",
  },
  {
    id: 2,
    name: "Advanced Calculus",
    professor: "Prof. Michael Nguyen",
    beginDate: "2026-01-12",
    endDate: "2026-04-22",
  },
  {
    id: 3,
    name: "Machine Learning Fundamentals",
    professor: "Dr. Sarah Ahmed",
    beginDate: "2026-01-15",
    endDate: "2026-04-25",
  },
  {
    id: 4,
    name: "Thermodynamics",
    professor: "Dr. James Patel",
    beginDate: "2026-01-11",
    endDate: "2026-04-18",
  },
  {
    id: 5,
    name: "Data Structures and Algorithms",
    professor: "Prof. Laura Chen",
    beginDate: "2026-01-14",
    endDate: "2026-04-24",
  },
];

export const PLACEHOLDER_USERS: User[] = [
  {
    username: "student_alex",
    pfp: "https://i.pravatar.cc/150?img=1",
    courses: ["Introduction to Physics", "Machine Learning Fundamentals"],
    courseids: [1, 2, 3, 4, 5],
    role: "student",
  },
  {
    username: "student_maya",
    pfp: "https://i.pravatar.cc/150?img=5",
    courses: ["Advanced Calculus", "Thermodynamics"],
    courseids: [5, 2, 1, 4],
    role: "student",
  },
  {
    username: "prof_carter",
    pfp: "https://i.pravatar.cc/150?img=12",
    courses: ["Introduction to Physics"],
    courseids: [1],
    role: "student",
  },
  {
    username: "prof_nguyen",
    pfp: "https://i.pravatar.cc/150?img=15",
    courses: ["Advanced Calculus"],
    courseids: [2],
    role: "student",
  },
  {
    username: "admin_user",
    pfp: "https://i.pravatar.cc/150?img=20",
    courses: [],
    courseids: [],
    role: "student",
  },
];
