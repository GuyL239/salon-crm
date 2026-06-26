"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Scissors, Mail, Lock, Eye, EyeOff } from "lucide-react";

// Map Supabase Auth error messages to user-friendly Hebrew
function toHebrewError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid email or password"))
    return "כתובת אימייל או סיסמה שגויים";
  if (m.includes("email not confirmed"))
    return "יש לאמת את כתובת האימייל תחילה";
  if (m.includes("too many requests") || m.includes("rate limit"))
    return "יותר מדי ניסיונות כניסה — נסה שוב מאוחר יותר";
  if (m.includes("network") || m.includes("fetch"))
    return "שגיאת רשת — בדוק את החיבור לאינטרנט";
  return "שגיאה בהתחברות — נסה שוב";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authErr) {
      setError(toHebrewError(authErr.message));
      setLoading(false);
      return;
    }

    // Session is now in cookies — refresh so middleware re-evaluates, then navigate
    router.refresh();
    router.push("/");
  }

  const inputBase =
    "w-full rounded-2xl border bg-gray-50 dark:bg-indigo-800/40 px-4 py-3.5 text-sm text-slate-900 dark:text-white outline-none transition-colors placeholder:text-slate-500 dark:placeholder:text-indigo-300 text-right";
  const inputIdle   = "border-gray-200 dark:border-indigo-700 focus:border-pink-400 dark:focus:border-pink-500";
  const inputError  = "border-red-300 dark:border-red-700 focus:border-red-400";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-indigo-950 px-5 py-12">
      <div className="w-full max-w-sm">

        {/* ── Brand ── */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-500 shadow-lg shadow-pink-200 dark:shadow-pink-900/40">
            <Scissors size={28} className="text-white" strokeWidth={2} />
          </div>
          <p className="text-3xl font-black tracking-tight leading-none">
            <span className="text-pink-500">Shaked</span>
            <span className="text-slate-900 dark:text-white">ia</span>
          </p>
        </div>

        {/* ── Card ── */}
        <div className="rounded-3xl bg-white dark:bg-indigo-900/60 p-7 shadow-xl shadow-black/[0.06] dark:shadow-black/30">
          <h1 className="mb-1 text-xl font-black text-slate-900 dark:text-white">
            ברוכים הבאים 👋
          </h1>
          <p className="mb-6 text-sm text-slate-400 dark:text-indigo-400">
            התחבר כדי לנהל את סדר היום שלך
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>

            {/* Email */}
            <div className="relative">
              <Mail
                size={16}
                strokeWidth={2}
                className="absolute top-1/2 -translate-y-1/2 end-3.5 text-slate-300 dark:text-indigo-500 pointer-events-none"
              />
              <input
                dir="rtl"
                type="email"
                autoComplete="email"
                placeholder="כתובת אימייל"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                required
                className={`${inputBase} ${error ? inputError : inputIdle} pe-10`}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock
                size={16}
                strokeWidth={2}
                className="absolute top-1/2 -translate-y-1/2 end-3.5 text-slate-300 dark:text-indigo-500 pointer-events-none"
              />
              <input
                dir="rtl"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="סיסמה"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                required
                className={`${inputBase} ${error ? inputError : inputIdle} pe-10 ps-10`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute top-1/2 -translate-y-1/2 start-3.5 text-slate-300 dark:text-indigo-500 hover:text-slate-500 dark:hover:text-indigo-300 transition-colors"
                aria-label={showPw ? "הסתר סיסמה" : "הצג סיסמה"}
              >
                {showPw ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 dark:bg-red-900/20 px-4 py-3">
                <span className="text-sm font-medium text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 py-3.5 text-sm font-bold text-white shadow-md shadow-pink-200 dark:shadow-pink-900/30 transition-all hover:bg-pink-600 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  מתחבר...
                </>
              ) : (
                "התחבר"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-indigo-600">
          shkedia · כל הזכויות שמורות
        </p>
      </div>
    </div>
  );
}
