"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import {
  Sun, Moon, Lock, Info, LogOut, Eye, EyeOff, X, Check,
} from "lucide-react";

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      dir="ltr"
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-pink-500" : "bg-gray-200 dark:bg-indigo-700"
      }`}
    >
      <div
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingsRow({
  icon: Icon, iconCls, label, right, onClick,
}: {
  icon: React.ElementType;
  iconCls: string;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 border-b border-gray-50 dark:border-indigo-800/30 bg-white dark:bg-indigo-900/50 px-4 py-3.5 last:border-0 ${onClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-indigo-800/30 transition-colors" : ""}`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon size={15} strokeWidth={2} />
      </div>
      <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">{label}</span>
      {right}
    </div>
  );
}

// ─── Change Password bottom-sheet ────────────────────────────────────────────
function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState(false);
  const [err, setErr]             = useState<string | null>(null);

  async function handleSave() {
    if (password.length < 6) {
      setErr("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    if (password !== confirm) {
      setErr("הסיסמאות אינן תואמות");
      return;
    }
    setSaving(true);
    setErr(null);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setErr("שגיאה בשינוי הסיסמה — נסה שוב");
      return;
    }
    setSuccess(true);
    setTimeout(onClose, 1500);
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 dark:border-indigo-700 bg-gray-50 dark:bg-indigo-800/60 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-pink-400 dark:focus:border-pink-600 transition-colors";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-screen-md rounded-t-3xl bg-white dark:bg-indigo-900 px-6 pt-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-indigo-700" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">שינוי סיסמה</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-indigo-800 text-slate-400"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Check size={26} strokeWidth={2.5} className="text-emerald-500" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">הסיסמה שונתה בהצלחה!</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-indigo-400">סיסמה חדשה</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    dir="rtl"
                    placeholder="לפחות 6 תווים"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErr(null); }}
                    className={`${inputCls} ps-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-indigo-400">אימות סיסמה</label>
                <input
                  type={showPw ? "text" : "password"}
                  dir="rtl"
                  placeholder="הזן שוב את הסיסמה"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErr(null); }}
                  className={inputCls}
                />
              </div>
            </div>

            {err && (
              <p className="mb-3 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">
                {err}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={onClose} className="rounded-2xl border border-gray-200 dark:border-indigo-700 py-3 text-sm font-bold text-slate-600 dark:text-indigo-300">
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !password || !confirm}
                className="rounded-2xl bg-pink-500 py-3 text-sm font-bold text-white shadow-md shadow-pink-200 dark:shadow-pink-900/30 disabled:opacity-60"
              >
                {saving ? "שומר..." : "שמור סיסמה"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const [userEmail, setUserEmail]         = useState<string | null>(null);
  const [loggingOut, setLoggingOut]       = useState(false);
  const [changePwOpen, setChangePwOpen]   = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <>
      {/* Profile card */}
      <div className="mb-4 flex items-center gap-4 rounded-3xl border border-gray-100 dark:border-indigo-800/30 bg-white dark:bg-indigo-900/50 p-4 shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/40 text-2xl select-none">
          👤
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-900 dark:text-white truncate">
            {userEmail ?? "..."}
          </p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-indigo-400">משתמש מערכת</p>
        </div>
      </div>

      {/* Display */}
      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-indigo-500">תצוגה</p>
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/30">
        <SettingsRow
          icon={isDark ? Moon : Sun}
          iconCls="bg-pink-50 text-pink-500 dark:bg-pink-950/30"
          label="מצב כהה"
          right={<Toggle on={isDark} onToggle={() => setTheme(isDark ? "light" : "dark")} />}
        />
      </div>

      {/* Security */}
      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-indigo-500">אבטחה</p>
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/30">
        <SettingsRow
          icon={Lock}
          iconCls="bg-indigo-50 text-indigo-500 dark:bg-indigo-800/50 dark:text-indigo-400"
          label="שינוי סיסמה"
          onClick={() => setChangePwOpen(true)}
          right={<span className="text-xs font-semibold text-pink-500">שנה →</span>}
        />
      </div>

      {/* About */}
      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-indigo-500">אודות</p>
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/30">
        <SettingsRow
          icon={Info}
          iconCls="bg-gray-100 text-gray-500 dark:bg-indigo-800/50 dark:text-indigo-400"
          label="גרסה"
          right={<span className="text-xs text-slate-400 dark:text-indigo-500">1.0.0</span>}
        />
      </div>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-100 dark:border-red-900/30 bg-white dark:bg-indigo-900/50 py-3.5 text-sm font-bold text-red-600 dark:text-red-400 disabled:opacity-60 transition-opacity"
      >
        {loggingOut ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-500" />
        ) : (
          <LogOut size={16} strokeWidth={2} />
        )}
        {loggingOut ? "מתנתק..." : "התנתק"}
      </button>

      {changePwOpen && <ChangePasswordSheet onClose={() => setChangePwOpen(false)} />}
    </>
  );
}
