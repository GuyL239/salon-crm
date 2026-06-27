"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { supabase } from "@/lib/supabase";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const isLogin  = pathname === "/login";

  useEffect(() => {
    // Keep the browser client in sync with the server session.
    // When the middleware refreshes an expiring token it sets a new cookie;
    // this listener picks that up and triggers a router refresh so RSC data
    // re-fetches with the updated JWT — ensuring auth.uid() stays valid in RLS.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "TOKEN_REFRESHED") {
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
    // Login page: no header, no bottom nav, just the page content
    return <>{children}</>;
  }

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full">
        <div className="mx-auto max-w-screen-md px-4 pt-4 pb-2">
          <div className="grid h-14 grid-cols-3 items-center rounded-3xl bg-white/90 dark:bg-indigo-900/80 px-5 shadow-[0_4px_24px_0_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] backdrop-blur-md transition-colors duration-300">
            {/* Right (RTL col-1) — scissors icon */}
            <div className="flex items-center justify-start">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-500 shadow-md shadow-pink-200 dark:shadow-pink-900/40">
                <Scissors size={16} className="text-white" strokeWidth={2} />
              </div>
            </div>
            {/* Center — brand */}
            <div className="flex items-center justify-center">
              <p className="text-lg font-black tracking-tight leading-none">
                <span className="text-pink-500">Shaked</span>
                <span className="text-slate-900 dark:text-white">ia</span>
              </p>
            </div>
            {/* Left (RTL col-3) — dark mode toggle */}
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
    </>
  );
}
