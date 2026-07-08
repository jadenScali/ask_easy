"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, MessageCircle, Users, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import ParticipantTable, { type Participant } from "./components/ParticipantTable";
import EngagementChart, { type WeeklyPoint } from "./components/EngagementChart";
import RangeSelector, { type DateRange } from "./components/RangeSelector";

interface Analytics {
  course: { id: string; code: string; name: string };
  summary: {
    totalQuestions: number;
    totalAnswers: number;
    activeParticipants: number;
    answeredRate: number;
  };
  participants: Participant[];
  weekly: WeeklyPoint[];
}

export default function CourseAnalyticsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>({});
  const [refreshing, setRefreshing] = useState(false);

  const handleRangeChange = (newRange: DateRange) => {
    setRefreshing(true);
    setRange(newRange);
  };

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    const qs = params.toString();
    fetch(`/api/courses/${courseId}/analytics${qs ? `?${qs}` : ""}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to load analytics.");
        } else {
          setAnalytics(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load analytics.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, range]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500">
        Loading analytics…
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-stone-600 font-medium">{error ?? "Failed to load analytics."}</p>
        <Link href="/" className="text-sm text-green-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const { course, summary, participants, weekly } = analytics;

  const statCards = [
    { label: "Questions", value: summary.totalQuestions, icon: MessageSquare },
    { label: "Answers", value: summary.totalAnswers, icon: MessageCircle },
    { label: "Active Participants", value: summary.activeParticipants, icon: Users },
    {
      label: "Answered Rate",
      value: `${Math.round(summary.answeredRate * 100)}%`,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to lectures
            </Link>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              {course.code} — Engagement Analytics
            </h1>
            <p className="text-stone-500 mt-1">{course.name}</p>
          </div>
          <RangeSelector onChange={handleRangeChange} />
        </div>

        <div
          className={`space-y-6 transition-opacity duration-150 ${refreshing ? "opacity-50" : ""}`}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-stone-500">{label}</CardTitle>
                  <Icon className="w-4 h-4 text-stone-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-stone-900">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <EngagementChart weekly={weekly} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <ParticipantTable participants={participants} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
