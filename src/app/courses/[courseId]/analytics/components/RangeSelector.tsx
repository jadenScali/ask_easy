"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

export interface DateRange {
  from?: string;
  to?: string;
}

type PresetKey = "all" | "today" | "week" | "month" | "4w" | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "4w", label: "Last 4 weeks" },
  { key: "custom", label: "Custom range" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the given local day as an ISO instant. */
function startOfLocalDay(d: Date): string {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

/** End of the given local day as an ISO instant. */
function endOfLocalDay(d: Date): string {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

// Presets use the instructor's local wall clock ("Today" means their today);
// the backend filters on the resulting instants.
function presetRange(key: PresetKey): DateRange {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: startOfLocalDay(now), to: endOfLocalDay(now) };
    case "week": {
      const monday = new Date(now.getTime() - ((now.getDay() + 6) % 7) * DAY_MS);
      return { from: startOfLocalDay(monday), to: endOfLocalDay(now) };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfLocalDay(first), to: endOfLocalDay(now) };
    }
    case "4w":
      return {
        from: startOfLocalDay(new Date(now.getTime() - 28 * DAY_MS)),
        to: endOfLocalDay(now),
      };
    default:
      return {};
  }
}

/**
 * Preset/custom time-range picker. Emits {from, to} ISO strings (or {} for
 * all time) — the page refetches the analytics endpoint with them.
 */
export default function RangeSelector({ onChange }: { onChange: (range: DateRange) => void }) {
  const [preset, setPreset] = useState<PresetKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const handlePreset = (key: PresetKey) => {
    setPreset(key);
    if (key !== "custom") onChange(presetRange(key));
  };

  const customValid = customFrom !== "" && customTo !== "" && customFrom <= customTo;

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
      <select
        value={preset}
        onChange={(e) => handlePreset(e.target.value as PresetKey)}
        className="h-9 px-3 rounded-md text-sm font-medium bg-white border border-stone-200 text-stone-700 hover:border-stone-300 transition-colors cursor-pointer"
        aria-label="Time range"
      >
        {PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>

      {preset === "custom" && (
        <>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-9 px-2 rounded-md text-sm bg-white border border-stone-200 text-stone-700"
            aria-label="From date"
          />
          <span className="text-stone-400 text-sm">–</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-9 px-2 rounded-md text-sm bg-white border border-stone-200 text-stone-700"
            aria-label="To date"
          />
          <button
            onClick={() =>
              onChange({
                from: startOfLocalDay(new Date(`${customFrom}T00:00:00`)),
                to: endOfLocalDay(new Date(`${customTo}T00:00:00`)),
              })
            }
            disabled={!customValid}
            className="h-9 px-3 rounded-md text-sm font-medium bg-stone-900 text-white hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </>
      )}
    </div>
  );
}
