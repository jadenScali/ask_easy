"use client";

import { useState } from "react";

export interface Participant {
  userId: string;
  name: string;
  role: "STUDENT" | "TA" | "PROFESSOR";
  questionsAsked: number;
  answersGiven: number;
  upvotesReceived: number;
}

type SortKey = "questionsAsked" | "answersGiven" | "upvotesReceived";

const ROLE_BADGE: Record<Participant["role"], string> = {
  PROFESSOR: "bg-green-100 text-green-800",
  TA: "bg-amber-100 text-amber-800",
  STUDENT: "bg-stone-100 text-stone-600",
};

/**
 * Contribution leaderboard, sortable by questions asked (top askers),
 * answers given (top answerers), or upvotes received. TA/professor rows are
 * highlighted via role badges.
 */
export default function ParticipantTable({ participants }: { participants: Participant[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("questionsAsked");

  if (participants.length === 0) {
    return <p className="text-sm text-stone-500 py-8 text-center">No participants yet.</p>;
  }

  const sorted = [...participants].sort((a, b) => b[sortKey] - a[sortKey]);

  const headers: { key: SortKey; label: string }[] = [
    { key: "questionsAsked", label: "Questions" },
    { key: "answersGiven", label: "Answers" },
    { key: "upvotesReceived", label: "Upvotes" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-500">
            <th className="py-2 pr-4 font-medium">#</th>
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Role</th>
            {headers.map(({ key, label }) => (
              <th key={key} className="py-2 pr-4 text-right">
                <button
                  onClick={() => setSortKey(key)}
                  className={`font-medium transition-colors ${
                    sortKey === key ? "text-stone-900" : "text-stone-500 hover:text-stone-900"
                  }`}
                  title={`Sort by ${label.toLowerCase()}`}
                >
                  {label}
                  {sortKey === key && " ↓"}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr key={p.userId} className="border-b border-stone-100 last:border-0">
              <td className="py-2 pr-4 text-stone-400">{i + 1}</td>
              <td className="py-2 pr-4 font-medium text-stone-900">{p.name}</td>
              <td className="py-2 pr-4">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${ROLE_BADGE[p.role]}`}
                >
                  {p.role}
                </span>
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{p.questionsAsked}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{p.answersGiven}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{p.upvotesReceived}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
