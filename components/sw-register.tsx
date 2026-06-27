"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js silently in the background.
 * Rendered once in the root layout; returns null (no UI).
 */
export function SwRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // SW registration failure is non-fatal — app works without it
        });
    }
  }, []);

  return null;
}
