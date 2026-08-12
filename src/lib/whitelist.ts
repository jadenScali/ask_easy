import type { Role } from "@/utils/types";

// ---------------------------------------------------------------------------
// Instructor whitelist
//
// Reads the PROFESSOR_WHITELIST env var to determine which UTORids are
// professors. Comma-separated; surrounding whitespace is ignored.
//
// Any UTORid in the list → PROFESSOR
// Any UTORid NOT in the list → STUDENT
//
// TAs are assigned per-course by professors via the UI and stored in
// CourseEnrollment.role. They are never listed here.
//
// Example:
//   PROFESSOR_WHITELIST=smithj,doejohn
// ---------------------------------------------------------------------------

function loadWhitelist(): Set<string> {
  const raw = process.env.PROFESSOR_WHITELIST;

  if (!raw) {
    // If the var is unset, everyone is a student — not a fatal error.
    console.warn("[whitelist] PROFESSOR_WHITELIST is not set. All users will be STUDENT.");
    return new Set();
  }

  const set = new Set<string>();

  for (const rawEntry of raw.split(",")) {
    const utorid = rawEntry.trim().toLowerCase();
    if (utorid) set.add(utorid);
  }

  return set;
}

// Loaded once at startup (module-level cache).
// Restart the server to pick up changes to PROFESSOR_WHITELIST.
const WHITELIST: Set<string> = loadWhitelist();

/**
 * Returns PROFESSOR if the UTORid is in the whitelist, STUDENT otherwise.
 * TAs are never in the whitelist — they are managed per-course via the UI.
 */
export function getRoleFromWhitelist(utorid: string): Role {
  return WHITELIST.has(utorid.toLowerCase()) ? "PROFESSOR" : "STUDENT";
}
