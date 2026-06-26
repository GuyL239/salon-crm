"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Sun, Moon, Bell, Lock, Fingerprint, Info, LogOut, CalendarDays, ChevronLeft,
} from "lucide-react";

// ─── Toggle (dir=ltr prevents RTL out-of-bounds bug) ─────────────────────────

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
  icon: Icon, iconCls, label, right,
}: {
  icon: React.ElementType; iconCls: string; label: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-50 dark:border-indigo-800/30 bg-white dark:bg-indigo-900/50 px-4 py-3.5 last:border-0">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon size={15} strokeWidth={2} />
      </div>
      <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">{label}</span>
      {right}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { theme, setTheme }               = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders]         = useState(true);
  const [biometric, setBiometric]         = useState(false);
  const isDark = theme === "dark";

  return (
    <>
      {/* Profile placeholder */}
      <div className="mb-4 flex items-center gap-4 rounded-3xl border border-gray-100 dark:border-indigo-800/30 bg-white dark:bg-indigo-900/50 p-4 shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/40 text-2xl">
          👤
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-900 dark:text-white">משתמש מערכת</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-indigo-400">אימות יתווסף בשלב הבא</p>
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

      {/* Notifications */}
      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-indigo-500">התראות</p>
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/30">
        <SettingsRow icon={Bell} iconCls="bg-amber-50 text-amber-500 dark:bg-amber-950/30" label="התראות פוש"
          right={<Toggle on={notifications} onToggle={() => setNotifications((v) => !v)} />} />
        <SettingsRow icon={CalendarDays} iconCls="bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30" label="תזכורות ביקור"
          right={<Toggle on={reminders} onToggle={() => setReminders((v) => !v)} />} />
      </div>

      {/* Security */}
      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-indigo-500">אבטחה</p>
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/30">
        <SettingsRow icon={Lock} iconCls="bg-gray-100 text-gray-500 dark:bg-indigo-800/50 dark:text-indigo-400" label="שינוי סיסמה"
          right={<ChevronLeft size={15} strokeWidth={2} className="text-gray-300 dark:text-indigo-600" />} />
        <SettingsRow icon={Fingerprint} iconCls="bg-gray-100 text-gray-500 dark:bg-indigo-800/50 dark:text-indigo-400" label="כניסה ביומטרית"
          right={<Toggle on={biometric} onToggle={() => setBiometric((v) => !v)} />} />
      </div>

      {/* About */}
      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-indigo-500">אודות</p>
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/30">
        <SettingsRow icon={Info} iconCls="bg-gray-100 text-gray-500 dark:bg-indigo-800/50 dark:text-indigo-400" label="גרסה"
          right={<span className="text-xs text-slate-400 dark:text-indigo-500">1.0.0</span>} />
      </div>

      <button className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-100 dark:border-red-900/30 bg-white dark:bg-indigo-900/50 py-3.5 text-sm font-bold text-red-600 dark:text-red-400">
        <LogOut size={16} strokeWidth={2} />
        התנתק
      </button>
    </>
  );
}
