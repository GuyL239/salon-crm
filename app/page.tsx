"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type City, type Salon, type Visit } from "@/lib/supabase";
import { NewVisitModal } from "@/components/new-visit-modal";
import {
  MapPin, Plus, Check, Phone, Navigation2,
  MessageSquare, ChevronDown, ChevronUp, ChevronLeft,
  Package, StickyNote, Pencil, X, Clock,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

// null = nothing chosen, "all" = all cities, number = specific city id
type CityFilter = number | "all" | null;

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
function fmtTime(t: string | null | undefined) {
  if (!t) return null;
  return t.substring(0, 5); // "HH:MM:SS" → "HH:MM"
}

// ─── Edit Salon Modal ─────────────────────────────────────────────────────────

function EditSalonModal({
  salon, onClose, onSaved,
}: {
  salon: Salon;
  onClose: () => void;
  onSaved: (id: number, phone: string | null, address: string) => void;
}) {
  const [phone, setPhone]     = useState(salon.phone_number ?? "");
  const [address, setAddress] = useState(salon.street_address);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from("salons")
      .update({ phone_number: phone.trim() || null, street_address: address.trim() })
      .eq("id", salon.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved(salon.id, phone.trim() || null, address.trim());
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 dark:border-indigo-700 bg-gray-50 dark:bg-indigo-800/60 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-pink-400 dark:focus:border-pink-600 transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-screen-md rounded-t-3xl bg-white dark:bg-indigo-900 px-6 pt-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-indigo-700" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">עריכת פרטי לקוח</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-indigo-800 text-slate-400">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
        <p className="mb-4 truncate text-sm font-bold text-pink-500">{salon.name}</p>
        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-indigo-400">כתובת</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-indigo-400">מספר טלפון</label>
            <input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
        </div>
        {err && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-mono text-red-600">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-2xl border border-gray-200 dark:border-indigo-700 py-3 text-sm font-bold text-slate-600 dark:text-indigo-300">ביטול</button>
          <button onClick={handleSave} disabled={saving} className="rounded-2xl bg-pink-500 py-3 text-sm font-bold text-white disabled:opacity-60">
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [cities, setCities]             = useState<City[]>([]);
  const [cityFilter, setCityFilter]     = useState<CityFilter>(null);
  const [salons, setSalons]             = useState<SalonWithMeta[]>([]);
  const [loading, setLoading]           = useState(false);
  const [showPicker, setShowPicker]     = useState(false);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [editingSalon, setEditingSalon] = useState<SalonWithMeta | null>(null);
  const [showNewVisit, setShowNewVisit] = useState(false);

  // Load cities + persisted filter
  useEffect(() => {
    supabase.from("cities").select("*").order("name").then(({ data }) => {
      if (data) setCities(data);
    });
    const saved = localStorage.getItem("shkedia_city");
    if (saved === "all") setCityFilter("all");
    else if (saved) setCityFilter(Number(saved));
  }, []);

  const loadSalons = useCallback(async (filter: number | "all") => {
    setLoading(true);
    setFetchError(null);
    try {
      const q =
        filter === "all"
          ? supabase.from("salons").select("*").order("name")
          : supabase.from("salons").select("*").eq("city_id", filter).order("name");

      const [salonsRes, visitsRes] = await Promise.all([
        q,
        supabase.from("visits").select("*").order("visit_date", { ascending: false }),
      ]);
      if (salonsRes.error) throw new Error(salonsRes.error.message);
      const all: Visit[] = visitsRes.data ?? [];
      const enriched: SalonWithMeta[] = (salonsRes.data ?? []).map((s) => ({
        ...s,
        todayVisit: all.find((v) => v.salon_id === s.id && v.visit_date === TODAY) ?? null,
        lastVisit:  all.find((v) => v.salon_id === s.id && v.visit_date !== TODAY) ?? null,
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
    if (cityFilter !== null) loadSalons(cityFilter);
    else setSalons([]);
  }, [cityFilter, loadSalons]);

  function selectFilter(f: CityFilter) {
    setCityFilter(f);
    localStorage.setItem("shkedia_city", f === null ? "" : String(f));
    setShowPicker(false);
  }

  function toggleExpand(id: number) {
    setSalons((prev) => prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)));
  }

  async function toggleCheck(salon: SalonWithMeta) {
    const willComplete = !(salon.todayVisit?.is_completed ?? false);
    setSalons((prev) =>
      prev.map((s) => {
        if (s.id !== salon.id) return s;
        const next: Visit = s.todayVisit
          ? { ...s.todayVisit, is_completed: willComplete }
          : { id: -1, salon_id: s.id, visit_date: TODAY, is_completed: true,
              visit_time: null, last_offer_description: null, notes: null,
              deal_amount: null, items_sold: null };
        return { ...s, todayVisit: next };
      })
    );
    if (salon.todayVisit) {
      await supabase.from("visits").update({ is_completed: willComplete }).eq("id", salon.todayVisit.id);
    } else {
      const { data } = await supabase
        .from("visits").insert({ salon_id: salon.id, visit_date: TODAY, is_completed: true })
        .select().single();
      if (data) setSalons((prev) => prev.map((s) => (s.id === salon.id ? { ...s, todayVisit: data } : s)));
    }
  }

  function handleSalonSaved(id: number, phone: string | null, address: string) {
    setSalons((prev) => prev.map((s) => (s.id === id ? { ...s, phone_number: phone, street_address: address } : s)));
    setEditingSalon(null);
  }

  // Determine current city id for the New Visit modal default
  const defaultCityId = typeof cityFilter === "number" ? cityFilter : undefined;
  const filterLabel = cityFilter === "all" ? "כל הערים"
    : cityFilter !== null ? (cities.find((c) => c.id === cityFilter)?.name ?? "") : null;

  const completed = salons.filter((s) => s.todayVisit?.is_completed).length;
  const total     = salons.length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      {/* City / filter picker */}
      <div className="pt-0 pb-2">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-2 rounded-2xl bg-pink-50 dark:bg-pink-950/30 px-4 py-2.5 text-sm font-bold text-pink-700 dark:text-pink-300"
        >
          <MapPin size={14} strokeWidth={2} />
          {filterLabel ? `סדר יום: ${filterLabel}` : "בחר עיר להיום"}
          {showPicker ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showPicker && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-gray-100 dark:border-indigo-800/50 bg-white dark:bg-indigo-900/80 shadow-lg">
            <button
              onClick={() => selectFilter("all")}
              className={`flex w-full items-center gap-3 border-b border-gray-50 dark:border-indigo-800/30 px-4 py-3 text-right text-sm hover:bg-pink-50 dark:hover:bg-pink-950/20 ${
                cityFilter === "all" ? "font-bold text-pink-600 dark:text-pink-400" : "font-medium text-slate-700 dark:text-indigo-200"
              }`}
            >
              {cityFilter === "all" && <Check size={13} className="shrink-0 text-pink-500" />}
              🌍 כל הערים
            </button>
            {cities.map((c) => (
              <button
                key={c.id}
                onClick={() => selectFilter(c.id)}
                className={`flex w-full items-center gap-3 border-b border-gray-50 dark:border-indigo-800/30 px-4 py-3 text-right text-sm last:border-0 hover:bg-pink-50 dark:hover:bg-pink-950/20 ${
                  cityFilter === c.id ? "font-bold text-pink-600 dark:text-pink-400" : "font-medium text-slate-700 dark:text-indigo-200"
                }`}
              >
                {cityFilter === c.id && <Check size={13} className="shrink-0 text-pink-500" />}
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Page heading */}
      {cityFilter !== null && (
        <div className="pb-3">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">סדר היום</h1>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-indigo-300/60">
            {hebrewDate()} · {total} ביקורים
          </p>
        </div>
      )}

      {/* Progress */}
      {total > 0 && (
        <div className="mb-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-indigo-800/50">
            <div className="h-full rounded-full bg-pink-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-slate-400 dark:text-indigo-400">
            <span>{completed} מתוך {total} הושלמו</span>
            <span>{pct}%</span>
          </div>
        </div>
      )}

      {/* New visit button — opens modal */}
      {cityFilter !== null && (
        <div className="mb-4">
          <button
            onClick={() => setShowNewVisit(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 py-3 text-sm font-bold text-white shadow-md shadow-pink-200 dark:shadow-pink-900/30"
          >
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
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700">שגיאה</p>
          <p className="mt-1 break-all font-mono text-xs text-red-600">{fetchError}</p>
        </div>
      )}

      {/* Empty state */}
      {cityFilter === null && !loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
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
        <div className="flex flex-col gap-2.5">
          {salons.map((salon) => {
            const isCompleted = salon.todayVisit?.is_completed ?? false;
            const time = fmtTime(salon.todayVisit?.visit_time);
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
                {/* Card header */}
                <div
                  className="flex cursor-pointer items-center gap-3 p-3.5"
                  onClick={() => toggleExpand(salon.id)}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleCheck(salon); }}
                    aria-label={isCompleted ? "סמן כלא הושלם" : "סמן כהושלם"}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                      isCompleted ? "border-pink-500 bg-pink-500 text-white" : "border-gray-200 dark:border-indigo-700"
                    }`}
                  >
                    {isCompleted && <Check size={12} strokeWidth={3} />}
                  </button>

                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 dark:bg-pink-950/30 text-sm font-black text-pink-600 dark:text-pink-300">
                    {salon.name.charAt(0)}
                  </div>

                  {/* Name + owner */}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-bold ${isCompleted ? "line-through text-slate-400 dark:text-indigo-500" : "text-slate-900 dark:text-white"}`}>
                      {salon.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-indigo-400">
                      {salon.owner_name}
                    </p>
                  </div>

                  {/* Time badge + expand arrow */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {time ? (
                      <span className="flex items-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-800/50 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-300" dir="ltr">
                        <Clock size={10} strokeWidth={2} />
                        {time}
                      </span>
                    ) : (
                      <span className="rounded-xl bg-gray-50 dark:bg-indigo-800/30 px-2.5 py-1 text-xs text-gray-400 dark:text-indigo-600">—</span>
                    )}
                    <ChevronLeft
                      size={15}
                      strokeWidth={2}
                      className={`text-slate-300 dark:text-indigo-600 transition-transform ${salon.expanded ? "-rotate-90" : ""}`}
                    />
                  </div>
                </div>

                {/* Expanded detail panel */}
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

                    <div className="grid grid-cols-3 gap-2">
                      {salon.phone_number ? (
                        <a
                          href={waLink(salon.phone_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white"
                        >
                          <MessageSquare size={12} strokeWidth={2} />
                          WhatsApp
                        </a>
                      ) : (
                        <button disabled className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-gray-100 dark:bg-indigo-800/40 py-2.5 text-xs font-bold text-gray-400">
                          <MessageSquare size={12} strokeWidth={2} />
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
                        <Navigation2 size={12} strokeWidth={2} />
                        Waze
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingSalon(salon); }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-indigo-700 bg-white dark:bg-indigo-800/50 py-2.5 text-xs font-bold text-slate-600 dark:text-indigo-300"
                      >
                        <Pencil size={12} strokeWidth={2} />
                        ערוך
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editingSalon && (
        <EditSalonModal
          salon={editingSalon}
          onClose={() => setEditingSalon(null)}
          onSaved={handleSalonSaved}
        />
      )}

      {/* New visit modal */}
      {showNewVisit && (
        <NewVisitModal
          defaultDate={TODAY}
          defaultCityId={defaultCityId}
          onClose={() => setShowNewVisit(false)}
          onSaved={() => {
            setShowNewVisit(false);
            if (cityFilter !== null) loadSalons(cityFilter);
          }}
        />
      )}
    </>
  );
}
