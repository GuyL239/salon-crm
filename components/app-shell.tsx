"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { supabase, BUILD_ID } from "@/lib/supabase";
import { appCache } from "@/lib/cache";

// ─── DEBUG BANNER ────────────────────────────────────────────────────────────
// Displays the authenticated user's email + a build-unique token so we can
// confirm: (a) which user Supabase actually sees, (b) that Vercel deployed
// this exact commit and isn't serving a stale cached build.
// REMOVE after the RLS / caching bug is confirmed fixed.
function DebugBanner() {
  const [email, setEmail] = useState<string>("loading...");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "NO USER (unauthenticated)");
    });
  }, []);

  return (
    <div
      dir="ltr"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#dc2626",
        color: "#fff",
        fontSize: "11px",
        fontFamily: "monospace",
        padding: "6px 10px",
        lineHeight: 1.4,
        wordBreak: "break-all",
      }}
    >
      <strong>🔴 DEBUG</strong> &nbsp;|&nbsp;
      <strong>USER:</strong> {email} &nbsp;|&nbsp;
      <strong>BUILD:</strong> {BUILD_ID}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const isLogin  = pathname === "/login";

  useEffect(() => {
    // Flush the in-memory cache and refresh server state on every auth change.
    // This prevents a previous user's cached data from being visible after
    // login/logout — the module-level appCache Map persists across route
    // navigations in the same browser session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "SIGNED_OUT") {
          appCache.invalidate(""); // clear all keys (empty prefix matches everything)
          router.refresh();
        }
        if (event === "SIGNED_OUT") {
          router.push("/login");
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [router]);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <DebugBanner />

      {/* push content below the fixed debug banner */}
      <div style={{ paddingTop: "30px" }}>
        {/* Header */}
        <header className="sticky top-0 z-50 w-full">
          <div className="mx-auto max-w-screen-md px-4 pt-4 pb-2">
            <div className="grid h-14 grid-cols-3 items-center rounded-3xl bg-white/90 dark:bg-indigo-900/80 px-5 shadow-[0_4px_24px_0_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] backdrop-blur-md transition-colors duration-300">
              <div className="flex items-center justify-start">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-500 shadow-md shadow-pink-200 dark:shadow-pink-900/40">
                  <Scissors size={16} className="text-white" strokeWidth={2} />
                </div>
              </div>
              <div className="flex items-center justify-center">
                <p className="text-lg font-black tracking-tight leading-none">
                  <span className="text-pink-500">Shaked</span>
                  <span className="text-slate-900 dark:text-white">ia</span>
                </p>
              </div>
              <div className="flex items-center justify-end">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 mx-auto w-full max-w-screen-md px-4 py-5 pb-20">
          {children}
        </main>

        <BottomNav />
      </div>
    </>
  );
}
