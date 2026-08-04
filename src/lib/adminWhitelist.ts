// ---------------------------------------------------------------------------
// Admin whitelist
//
// Reads the ADMIN_WHITELIST env var to determine which UTORids have god-mode
// dashboard access. Comma-separated; surrounding whitespace is ignored.
//
// Example:
//   ADMIN_WHITELIST=smithj,doejohn
// ---------------------------------------------------------------------------

function loadAdminWhitelist(): Set<string> {
  const raw = process.env.ADMIN_WHITELIST;

  if (!raw) {
    console.warn(
      "[admin-whitelist] ADMIN_WHITELIST is not set. No users will have dashboard access."
    );
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
// Restart the server to pick up changes to ADMIN_WHITELIST.
const ADMIN_WHITELIST: Set<string> = loadAdminWhitelist();

/**
 * Returns true if the UTORid is in the admin whitelist.
 */
export function isAdmin(utorid: string): boolean {
  return ADMIN_WHITELIST.has(utorid.toLowerCase());
}

/**
 * Returns all admin UTORids as an array.
 */
export function getAdminUtorids(): string[] {
  return Array.from(ADMIN_WHITELIST);
}
