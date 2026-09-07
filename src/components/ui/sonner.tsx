"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

import { MoodSadDizzy } from "@/components/icons/mood-sad-dizzy";

/**
 * shadcn's sonner wrapper. The upstream version reads the active theme from
 * next-themes; this app has no theme provider and renders light only, so the
 * hook is left out rather than pulling in a dependency for a constant.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      // richColors gives toast.error its own red palette instead of the
      // neutral popover surface used by plain toasts.
      richColors
      icons={{ error: <MoodSadDizzy className="h-5 w-5" /> }}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
