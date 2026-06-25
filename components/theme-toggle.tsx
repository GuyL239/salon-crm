"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-8 rounded-2xl bg-gray-100 dark:bg-indigo-800/60 animate-pulse" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "עבור למצב בהיר" : "עבור למצב כהה"}
      className={[
        "relative flex h-8 w-8 items-center justify-center rounded-2xl transition-all duration-300",
        "bg-gray-100 dark:bg-indigo-800/60",
        "hover:scale-110 active:scale-95",
        isDark ? "hover:bg-amber-100/20" : "hover:bg-pink-50",
      ].join(" ")}
    >
      <Sun
        size={15}
        strokeWidth={2}
        className={[
          "absolute transition-all duration-500 text-amber-500",
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50",
        ].join(" ")}
      />
      <Moon
        size={14}
        strokeWidth={2}
        className={[
          "absolute transition-all duration-500 text-slate-500 dark:text-indigo-300",
          isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100",
        ].join(" ")}
      />
    </button>
  );
}
