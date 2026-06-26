"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { supabase, type City, type Salon, type Visit } from "@/lib/supabase";
import {
  Home, Building2, CalendarDays, Settings,
  MapPin, Plus, Check, Phone, Navigation2,
  MessageSquare, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Package, StickyNote, Sun, Moon, Bell, Lock, Fingerprint,
  Info, LogOut, Type,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

const TINTS = [
  { bg: "bg-pink-50 dark:bg-pink-950/30",      text: "text-pink-600 dark:text-pink-300" },
  { bg: "bg-sky-50 dark:bg-sky-950/30",        text: "text-sky-600 dark:text-sky-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-300" },
  { bg: "bg-violet-50 dark:bg-violet-950/30",   text: "text-violet-600 dark:text-violet-300" },
  { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-600 dark:text-amber-300" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "home" | "cities" | "calendar" | "settings";

type SalonWithMeta = Salon & {
  todayVisit: Visit | null;
  lastVisit: Visit | null;
  expanded: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hebrewDate() {
  return new Date().toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
function wazeLink(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}`;
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────

function HomeTab() {
  const [cities, setCities] = useState<City[]>([]);
  const [todayCityId, setTodayCityId] = useState<number | null>(null);
  const [salons, setSalons] = useState<SalonWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("cities").select("*").order("name").then(({ data }) => {
      if (data) setCities(data);
    });
    const saved = localStorage.getItem("shkedia_city");
    if (saved) setTodayCityId(Number(saved));
  }, []);

  const loadSalons = useCallback(async (cityId: number) => {
    setLoading(true);
    setFetchError(null);
    try {
      const [salonsRes, visitsRes] = await Promise.all([
        supabase.from("salons").select("*").eq("city_id", cityId).order("name"),
        supabase.from("visits").select("*").order("visit_date", { ascending: false }),
      ]);
      if (salonsRes.error) throw new Error(salonsRes.error.message);
      const allVisits: Visit[] = visitsRes.data ?? [];
      const enriched: SalonWithMeta[] = (salonsRes.data ?? []).map((s) => ({
        ...s,
        todayVisit: allVisits.find((v) => v.salon_id === s.id && v.visit_date === TODAY) ?? null,
        lastVisit:  allVisits.find((v) => v.salon_id === s.id && v.visit_date !== TODAY) ?? null,
        expanded: false,
      }));
      setSalons(enriched);
    } catch (err: any) {
      setFetchError(err?.message ?? "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (todayCityId) loadSalons(todayCityId);
    else setSalons([]);
  }, [todayCityId, loadSalons]);

  function selectCity(id: number) {
    setTodayCityId(id);
    localStorage.setItem("shkedia_city", String(id));
    setShowPicker(false);
  }

  function toggleExpand(id: number) {
    setSalons((prev) => prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)));
  }

  async function toggleCheck(salon: SalonWithMeta) {
    const wasCompleted = salon.todayVisit?.is_completed ?? false;
    const willComplete = !wasCompleted;

    // Optimistic update
    setSalons((prev) =>
      prev.map((s) => {
        if (s.id !== salon.id) return s;
        const optimistic: Visit = s.todayVisit
          ? { ...s.todayVisit, is_completed: willComplete }
          : { id: -1, salon_id: s.id, visit_date: TODAY, is_completed: true,
              last_offer_description: null, notes: null, deal_amount: null, items_sold: null };
        return { ...s, todayVisit: optimistic };
      })
    );

    if (salon.todayVisit) {
      await supabase.from("visits").update({ is_completed: willComplete }).eq("id", salon.todayVisit.id);
    } else {
      const { data } = await supabase
        .from("visits")
        .insert({ salon_id: salon.id, visit_date: TODAY, is_completed: true })
        .select()
        .single();
      if (data) {
        setSalons((prev) => prev.map((s) => (s.id === salon.id ? { ...s, todayVisit: data } : s)));
      }
    }
  }

  const todayCity = cities.find((c) => c.id === todayCityId);
  const completed = salons.filter((s) => s.todayVisit?.is_completed).length;
  const total = salons.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      {/* City picker */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-2 rounded-2xl bg-pink-50 dark:bg-pink-950/30 px-4 py-2.5 text-sm font-bold text-pink-700 dark:text-pink-300"
        >
          <MapPin size={14} strokeWidth={2} />
          {todayCity ? `העיר להיום: ${todayCity.name}` : "בחר עיר להיום"}
          {showPicker ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showPicker && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/50 bg-white dark:bg-indigo-900/80 shadow-lg">
            {cities.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCity(c.id)}
                className={`flex w-full items-center gap-3 border-b border-gray-50 dark:border-indigo-800/30 px-4 py-3 text-right text-sm last:border-0 hover:bg-pink-50 dark:hover:bg-pink-950/20 ${
                  todayCityId === c.id
                    ? "font-bold text-pink-600 dark:text-pink-400"
                    : "font-medium text-slate-700 dark:text-indigo-200"
                }`}
              >
                {todayCityId === c.id && <Check size={13} className="shrink-0 text-pink-500" />}
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Heading */}
      {todayCity && (
        <div className="px-4 pb-3">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">סדר היום</h1>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-indigo-300/60">
            {hebrewDate()} · {total} ביקורים
          </p>
        </div>
      )}

      {/* Progress */}
      {total > 0 && (
        <div className="px-4 mb-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-indigo-800/50">
            <div className="h-full rounded-full bg-pink-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-slate-400 dark:text-indigo-400">
            <span>{completed} מתוך {total} הושלמו</span>
            <span>{pct}%</span>
          </div>
        </div>
      )}

      {/* New visit button */}
      {todayCity && (
        <div className="px-4 mb-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 py-3 text-sm font-bold text-white shadow-md shadow-pink-200 dark:shadow-pink-900/30">
            <Plus size={16} strokeWidth={2.5} />
            ביקור חדש
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-14">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
          <p className="text-sm text-slate-400">טוען נתונים...</p>
        </div>
      )}

      {/* Error */}
      {fetchError && (
        <div className="mx-4 rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700">שגיאה</p>
          <p className="mt-1 break-all font-mono text-xs text-red-600">{fetchError}</p>
        </div>
      )}

      {/* Empty — no city chosen */}
      {!todayCityId && !loading && (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-50 dark:bg-pink-950/30">
            <MapPin size={28} className="text-pink-400" />
          </div>
          <p className="font-black text-slate-900 dark:text-white">בחר עיר להתחיל</p>
          <p className="text-sm text-slate-400 dark:text-indigo-400">
            לחץ על הכפתור למעלה לבחור את העיר שלך להיום
          </p>
        </div>
      )}

      {/* Salon cards */}
      {!loading && salons.length > 0 && (
        <div className="flex flex-col gap-2.5 px-4">
          {salons.map((salon) => {
            const isCompleted = salon.todayVisit?.is_completed ?? false;
            return (
              <div
                key={salon.id}
                className={`overflow-hidden rounded-3xl border bg-white dark:bg-indigo-900/50 shadow-sm shadow-black/[0.04] dark:shadow-black/20 transition-all ${
                  isCompleted
                    ? "border-gray-100 dark:border-indigo-800/30 opacity-60"
                    : salon.expanded
                    ? "border-pink-300 dark:border-pink-800/50"
                    : "border-gray-100 dark:border-indigo-800/30"
                }`}
              >
                {/* Header row */}
                <div
                  className="flex cursor-pointer items-center gap-3 p-3.5"
                  onClick={() => toggleExpand(salon.id)}
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleCheck(salon); }}
                    aria-label={isCompleted ? "סמן כלא הושלם" : "סמן כהושלם"}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                      isCompleted
                        ? "border-pink-500 bg-pink-500 text-white"
                        : "border-gray-200 dark:border-indigo-700"
                    }`}
                  >
                    {isCompleted && <Check size={12} strokeWidth={3} />}
                  </button>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 dark:bg-pink-950/30 text-sm font-black text-pink-600 dark:text-pink-300">
                    {salon.name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-bold ${isCompleted ? "line-through text-slate-400 dark:text-indigo-500" : "text-slate-900 dark:text-white"}`}>
                      {salon.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-indigo-400">
                      {salon.owner_name}
                    </p>
                  </div>

                  <ChevronLeft
                    size={15}
                    strokeWidth={2}
                    className={`shrink-0 text-slate-300 dark:text-indigo-600 transition-transform ${salon.expanded ? "-rotate-90" : ""}`}
                  />
                </div>

                {/* Expanded detail */}
                {salon.expanded && (
                  <div className="border-t border-gray-50 dark:border-indigo-800/50 bg-gray-50/50 dark:bg-indigo-950/20 px-4 py-3">
                    <div className="mb-3 flex flex-col gap-2">
                      {salon.street_address && (
                        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-indigo-300/70">
                          <MapPin size={12} className="mt-0.5 shrink-0 text-pink-400" />
                          <span>{salon.street_address}</span>
                        </div>
                      )}
                      {salon.phone_number && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-indigo-300/70">
                          <Phone size={12} className="shrink-0 text-pink-400" />
                          <span dir="ltr">{salon.phone_number}</span>
                        </div>
                      )}
                      {salon.lastVisit?.items_sold && (
                        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-indigo-300/70">
                          <Package size={12} className="mt-0.5 shrink-0 text-pink-400" />
                          <span><strong>אחרון: </strong>{salon.lastVisit.items_sold}</span>
                        </div>
                      )}
                      {salon.lastVisit?.notes && (
                        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-indigo-300/70">
                          <StickyNote size={12} className="mt-0.5 shrink-0 text-pink-400" />
                          <span>{salon.lastVisit.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {salon.phone_number ? (
                        <a
                          href={waLink(salon.phone_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white"
                        >
                          <MessageSquare size={13} strokeWidth={2} />
                          WhatsApp
                        </a>
                      ) : (
                        <button disabled className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-gray-100 dark:bg-indigo-800/40 py-2.5 text-xs font-bold text-gray-400">
                          <MessageSquare size={13} strokeWidth={2} />
                          WhatsApp
                        </button>
                      )}
                      <a
                        href={wazeLink(salon.street_address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 py-2.5 text-xs font-bold text-white"
                      >
                        <Navigation2 size={13} strokeWidth={2} />
                        Waze
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}

// ─── Cities Tab ───────────────────────────────────────────────────────────────

function CitiesTab() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase.from("cities").select("*").order("name").then(({ data, error }) => {
      if (error) setFetchError(error.message);
      else setCities(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">ערים</h1>
        <button className="flex items-center gap-1.5 rounded-2xl bg-pink-50 dark:bg-pink-950/30 px-4 py-2 text-xs font-bold text-pink-600 dark:text-pink-300">
          <Plus size={13} strokeWidth={2.5} />
          הוסף עיר
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-14">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
        </div>
      )}

      {fetchError && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <p className="break-all font-mono text-sm font-bold text-red-700">{fetchError}</p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {cities.map((city, i) => {
          const t = TINTS[i % TINTS.length];
          return (
            <button
              key={city.id}
              onClick={() => router.push(`/cities/${city.id}`)}
              className="flex items-center gap-4 rounded-3xl border border-gray-100 dark:border-indigo-800/30 bg-white dark:bg-indigo-900/50 p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${t.bg} ${t.text}`}>
                {city.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-slate-900 dark:text-white">{city.name}</p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-indigo-400">לחץ לצפייה בסלונים</p>
              </div>
              <ChevronLeft size={16} strokeWidth={2} className="shrink-0 text-gray-300 dark:text-indigo-600" />
            </button>
          );
        })}
      </div>
      <div className="h-2" />
    </div>
  );
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────

const HE_MONTHS = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר",
];
const DAY_NAMES = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];

function CalendarTab() {
  const now = new Date();
  const [year, setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [visitDates, setVisitDates] = useState<Set<string>>(new Set());
  const [calLoading, setCalLoading] = useState(false);

  useEffect(() => {
    setCalLoading(true);
    const mm      = String(month + 1).padStart(2, "0");
    const lastDay = new Date(year, month + 1, 0).getDate();
    const start   = `${year}-${mm}-01`;
    const end     = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
    supabase
      .from("visits")
      .select("visit_date")
      .gte("visit_date", start)
      .lte("visit_date", end)
      .then(({ data }) => {
        setVisitDates(new Set((data ?? []).map((v) => v.visit_date)));
        setCalLoading(false);
      });
  }, [year, month]);

  function prevMonth() {
    if (month > 0) setMonth((m) => m - 1);
    else { setMonth(11); setYear((y) => y - 1); }
  }
  function nextMonth() {
    if (month < 11) setMonth((m) => m + 1);
    else { setMonth(0); setYear((y) => y + 1); }
  }

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-indigo-800/50 text-slate-500 dark:text-indigo-300">
          <ChevronRight size={16} />
        </button>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          {HE_MONTHS[month]} {year}
        </h2>
        <button onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-indigo-800/50 text-slate-500 dark:text-indigo-300">
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-bold text-slate-300 dark:text-indigo-600">{d}</div>
        ))}
      </div>

      {calLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d       = i + 1;
            const mm      = String(month + 1).padStart(2, "0");
            const dateStr = `${year}-${mm}-${String(d).padStart(2, "0")}`;
            const isToday = dateStr === TODAY;
            const hasVisit = visitDates.has(dateStr);
            return (
              <div key={d} className="flex flex-col items-center py-0.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                  isToday
                    ? "bg-pink-500 font-bold text-white"
                    : "font-medium text-slate-700 dark:text-indigo-200 hover:bg-pink-50 dark:hover:bg-pink-950/20"
                }`}>
                  {d}
                </div>
                <div className={`mt-0.5 h-1.5 w-1.5 rounded-full bg-pink-400 transition-opacity ${hasVisit ? "opacity-100" : "opacity-0"}`} />
              </div>
            );
          })}
        </div>
      )}
      <div className="h-2" />
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

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

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-pink-500" : "bg-gray-200 dark:bg-indigo-700"}`}
    >
      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function SettingsTab() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders]         = useState(true);
  const [biometric, setBiometric]         = useState(false);
  const isDark = theme === "dark";

  return (
    <div className="px-4 pt-4">
      {/* Profile */}
      <div className="mb-4 flex items-center gap-4 rounded-3xl border border-gray-100 dark:border-indigo-800/30 bg-white dark:bg-indigo-900/50 p-4 shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pink-500 text-xl font-black text-white">נ</div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-900 dark:text-white">נדב כהן</p>
          <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-indigo-400">nadav@shkedia.co.il</p>
        </div>
        <button className="rounded-2xl border border-gray-200 dark:border-indigo-700 bg-gray-50 dark:bg-indigo-800/50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-indigo-300">
          עריכה
        </button>
      </div>

      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-indigo-500">תצוגה</p>
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/30">
        <SettingsRow icon={isDark ? Moon : Sun} iconCls="bg-pink-50 text-pink-500 dark:bg-pink-950/30" label="מצב כהה"
          right={<Toggle on={isDark} onToggle={() => setTheme(isDark ? "light" : "dark")} />} />
        <SettingsRow icon={Type} iconCls="bg-sky-50 text-sky-500 dark:bg-sky-950/30" label="גודל טקסט"
          right={<span className="text-xs text-slate-400 dark:text-indigo-500">בינוני</span>} />
      </div>

      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-indigo-500">התראות</p>
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/30">
        <SettingsRow icon={Bell} iconCls="bg-amber-50 text-amber-500 dark:bg-amber-950/30" label="התראות פוש"
          right={<Toggle on={notifications} onToggle={() => setNotifications((v) => !v)} />} />
        <SettingsRow icon={CalendarDays} iconCls="bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30" label="תזכורות ביקור"
          right={<Toggle on={reminders} onToggle={() => setReminders((v) => !v)} />} />
      </div>

      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-indigo-500">אבטחה</p>
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/30">
        <SettingsRow icon={Lock} iconCls="bg-gray-100 text-gray-500 dark:bg-indigo-800/50 dark:text-indigo-400" label="שינוי סיסמה"
          right={<ChevronLeft size={15} strokeWidth={2} className="text-gray-300 dark:text-indigo-600" />} />
        <SettingsRow icon={Fingerprint} iconCls="bg-gray-100 text-gray-500 dark:bg-indigo-800/50 dark:text-indigo-400" label="כניסה ביומטרית"
          right={<Toggle on={biometric} onToggle={() => setBiometric((v) => !v)} />} />
      </div>

      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-indigo-500">אודות</p>
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/30">
        <SettingsRow icon={Info} iconCls="bg-gray-100 text-gray-500 dark:bg-indigo-800/50 dark:text-indigo-400" label="גרסה"
          right={<span className="text-xs text-slate-400 dark:text-indigo-500">1.0.0</span>} />
      </div>

      <button className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-100 dark:border-red-900/30 bg-white dark:bg-indigo-900/50 py-3.5 text-sm font-bold text-red-600 dark:text-red-400">
        <LogOut size={16} strokeWidth={2} />
        התנתק
      </button>
      <div className="h-2" />
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: "home",     label: "בית",    Icon: Home },
  { id: "cities",   label: "ערים",   Icon: Building2 },
  { id: "calendar", label: "יומן",   Icon: CalendarDays },
  { id: "settings", label: "הגדרות", Icon: Settings },
];

// ─── Page Shell ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  useEffect(() => {
    const saved = localStorage.getItem("shkedia_tab") as TabId | null;
    if (saved) setActiveTab(saved);
  }, []);

  function switchTab(tab: TabId) {
    setActiveTab(tab);
    localStorage.setItem("shkedia_tab", tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <div className="pb-20">
        {activeTab === "home"     && <HomeTab />}
        {activeTab === "cities"   && <CitiesTab />}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-screen-md">
          <nav className="relative flex h-16 items-stretch border-t border-gray-100 dark:border-indigo-800/50 bg-white/90 dark:bg-indigo-900/90 backdrop-blur-md">
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => switchTab(id)}
                  className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                    active
                      ? "text-pink-500"
                      : "text-slate-400 dark:text-indigo-500 hover:text-slate-600 dark:hover:text-indigo-300"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  <span className="text-[10px] font-semibold">{label}</span>
                  {active && (
                    <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-pink-500" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
