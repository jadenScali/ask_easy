"use client";

export interface WeeklyPoint {
  week: number;
  weekStart: string;
  questions: number;
  answers: number;
  activeUsers: number;
}

const SLOT_W = 52;
const HEIGHT = 220;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;
const BAR_W = 10;

/**
 * Weekly engagement chart (SVG, no charting dependency): grouped bars for
 * questions/answers with matching trend lines, plus a dashed line for active
 * users. Empty weeks render as zero-height bars so the timeline stays
 * contiguous.
 */
export default function EngagementChart({ weekly }: { weekly: WeeklyPoint[] }) {
  if (weekly.length === 0) {
    return (
      <p className="text-sm text-stone-500 py-8 text-center">No activity in this time range.</p>
    );
  }

  const width = weekly.length * SLOT_W;
  const bottom = HEIGHT - PAD_BOTTOM;
  const max = Math.max(1, ...weekly.map((w) => Math.max(w.questions, w.answers, w.activeUsers)));

  const xAt = (i: number) => i * SLOT_W + SLOT_W / 2;
  const yAt = (v: number) => PAD_TOP + (1 - v / max) * (bottom - PAD_TOP);
  const points = (get: (w: WeeklyPoint) => number) =>
    weekly.map((w, i) => `${xAt(i)},${yAt(get(w))}`).join(" ");

  return (
    <div>
      <div className="overflow-x-auto">
        <svg width={width} height={HEIGHT} role="img" aria-label="Weekly engagement chart">
          {/* Baseline */}
          <line x1={0} y1={bottom} x2={width} y2={bottom} stroke="#e7e5e4" strokeWidth={1} />

          {/* Bars */}
          {weekly.map((w, i) => (
            <g key={w.week}>
              <rect
                x={xAt(i) - BAR_W - 1}
                y={yAt(w.questions)}
                width={BAR_W}
                height={bottom - yAt(w.questions)}
                rx={2}
                className="fill-green-500/70"
              />
              <rect
                x={xAt(i) + 1}
                y={yAt(w.answers)}
                width={BAR_W}
                height={bottom - yAt(w.answers)}
                rx={2}
                className="fill-amber-400/70"
              />
            </g>
          ))}

          {/* Trend lines */}
          <polyline
            points={points((w) => w.questions)}
            fill="none"
            className="stroke-green-600"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <polyline
            points={points((w) => w.answers)}
            fill="none"
            className="stroke-amber-500"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <polyline
            points={points((w) => w.activeUsers)}
            fill="none"
            className="stroke-blue-500"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />

          {/* Data dots on the lines */}
          {weekly.map((w, i) => (
            <g key={`dots-${w.week}`}>
              <circle cx={xAt(i)} cy={yAt(w.questions)} r={2.5} className="fill-green-600" />
              <circle cx={xAt(i)} cy={yAt(w.answers)} r={2.5} className="fill-amber-500" />
              <circle cx={xAt(i)} cy={yAt(w.activeUsers)} r={2.5} className="fill-blue-500" />
            </g>
          ))}

          {/* Week labels + hover tooltips */}
          {weekly.map((w, i) => (
            <g key={`label-${w.week}`}>
              <text
                x={xAt(i)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-stone-400"
                fontSize={10}
              >
                W{w.week}
              </text>
              <rect x={i * SLOT_W} y={0} width={SLOT_W} height={HEIGHT} fill="transparent">
                <title>{`Week ${w.week} (${w.weekStart})\n${w.questions} questions, ${w.answers} answers, ${w.activeUsers} active users`}</title>
              </rect>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-stone-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500" />
          Questions
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-400" />
          Answers
        </span>
        <span className="flex items-center gap-1.5">
          <svg width={16} height={8} aria-hidden="true">
            <line
              x1={0}
              y1={4}
              x2={16}
              y2={4}
              className="stroke-blue-500"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          </svg>
          Active users
        </span>
      </div>
    </div>
  );
}
