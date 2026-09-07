// ---------------------------------------------------------------------------
// Session cookie name resolution
//
// `pnpm dev:all` runs three dev servers on localhost:3000-3002, each logged in
// as a different persona. Browser cookies are keyed by host and ignore the
// port, so all three ports share one cookie jar — with a single cookie name
// they would clobber each other's session and every tab would silently become
// whoever logged in last.
//
// The launcher gives each instance its own SESSION_COOKIE_NAME. Each process
// only ever looks up its own name and is blind to the other two.
//
// This module is deliberately dependency-free: src/middleware.ts imports it and
// runs in the Edge runtime.
// ---------------------------------------------------------------------------

export const DEFAULT_COOKIE_NAME = "ask_easy_session";

/**
 * Returns the iron-session cookie name for this process.
 *
 * Safety condition added to ensure dev cookies aren't read in production.
 */
export function resolveCookieName(): string {
  if (process.env.NODE_ENV === "production") return DEFAULT_COOKIE_NAME;
  return process.env.SESSION_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}
