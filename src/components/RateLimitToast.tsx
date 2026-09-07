"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CountdownProps {
  message: string;
  seconds: number;
}

/** Ticks the remaining cooldown down beside the server's message. */
function Countdown({ message, seconds }: CountdownProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const timer = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span>
      {message} Wait {remaining}s
    </span>
  );
}

/**
 * Shows a rate-limit refusal, counting down to when the action can be retried.
 *
 * The toast lives exactly as long as the cooldown, so it clears itself the
 * moment the user is allowed to try again. Without a usable retry window —
 * Redis unreachable, say — it falls back to the bare message.
 */
export function showRateLimitToast(message: string, retryAfterSeconds?: number) {
  if (!retryAfterSeconds || retryAfterSeconds <= 0) {
    toast.error(message);
    return;
  }

  toast.error(<Countdown message={message} seconds={retryAfterSeconds} />, {
    duration: retryAfterSeconds * 1000,
  });
}
