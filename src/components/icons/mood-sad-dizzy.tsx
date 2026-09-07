import type { SVGProps } from "react";

/**
 * Tabler's `mood-sad-dizzy`, inlined rather than depending on
 * @tabler/icons-react for a single glyph. Tabler Icons are MIT licensed.
 * https://tabler.io/icons/icon/mood-sad-dizzy
 */
export function MoodSadDizzy(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M14.5 16.05a3.5 3.5 0 0 0 -5 0" />
      <path d="M8 9l2 2" />
      <path d="M10 9l-2 2" />
      <path d="M14 9l2 2" />
      <path d="M16 9l-2 2" />
    </svg>
  );
}
