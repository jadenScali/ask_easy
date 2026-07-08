// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface AnalyticsRangeResult extends ValidationResult {
  /** Parsed values, present when valid. Absent params stay undefined. */
  from?: Date;
  to?: Date;
  weekStart?: Date;
}

// ---------------------------------------------------------------------------
// Validation Functions
// ---------------------------------------------------------------------------

function parseDateParam(name: string, raw: string | null): { date?: Date; error?: string } {
  if (raw === null || raw.trim() === "") return {};
  const date = new Date(raw);
  if (isNaN(date.getTime())) {
    return { error: `${name} must be a valid ISO date.` };
  }
  return { date };
}

/**
 * Validates the optional date-range query params of the analytics endpoint.
 * All params are optional; when both `from` and `to` are present, `from`
 * must not be after `to`.
 */
export function validateAnalyticsRange(
  from: string | null,
  to: string | null,
  weekStart: string | null = null
): AnalyticsRangeResult {
  const fromResult = parseDateParam("from", from);
  if (fromResult.error) return { valid: false, error: fromResult.error };

  const toResult = parseDateParam("to", to);
  if (toResult.error) return { valid: false, error: toResult.error };

  const weekStartResult = parseDateParam("weekStart", weekStart);
  if (weekStartResult.error) return { valid: false, error: weekStartResult.error };

  if (fromResult.date && toResult.date && fromResult.date > toResult.date) {
    return { valid: false, error: "from must be before or equal to to." };
  }

  return {
    valid: true,
    from: fromResult.date,
    to: toResult.date,
    weekStart: weekStartResult.date,
  };
}
