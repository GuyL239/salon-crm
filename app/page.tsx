"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { supabase, type City, type Salon, type Visit } from "@/lib/supabase";
import { appCache } from "@/lib/cache";
import { NewVisitModal } from "@/components/new-visit-modal";
import {
  MapPin, Plus, Check, Phone, Navigation2,
  MessageSquare, ChevronDown, ChevronUp, ChevronLeft,
  Package, StickyNote, Pencil, X, Clock, Trash2,
} from "lucide-react";

// ─── Midnight-safe local date ─────────────────────────────────────────────────
// new Date().toISOString() is UTC — it returns yesterday in Israel after midnight.
// Always format using local date parts instead.
function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

// null = nothing chosen, "all" = all cities, number = specific city id
type CityFilter = number | "all" | null;

// One agenda row = one scheduled visit + the salon it belongs to + the last
// previous visit (for product/notes context).  Only salons with an actual
// visit for agendaDate are included — new clients without a visit are hidden.
type AgendaItem = {
  visit: Visit;
  salon: Salon;
  lastVisit: Visit | null;
  expanded: boolean;
};

// Shape returned by "visits!inner salons" join
type VisitWithSalonJoin = Visit & { salons: Salon };

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

// ─── Edit Item Modal (salon fields + visit time) ──────────────────────────────

function EditItemModal({
  item, onClose, onSaved,
}: {
  item: AgendaItem;
  onClose: () => void;
  onSaved: (salonId: number, visitId: number, phone: string | null, address: string, visitTime: string | null) => void;
}) {
  const [phone, setPhone]     = useState(item.salon.phone_number ?? "");
  const [address, setAddress] = useState(item.salon.street_address);
  const [time, setTime]       = useState(
    item.visit.visit_time ? item.visit.visit_time.substring(0, 5) : ""
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setErr(null);
    const [salonRes, visitRes] = await Promise.all([
      supabase.from("salons")
        .update({ phone_number: phone.trim() || null, street_address: address.trim() })
        .eq("id", item.salon.id),
      supabase.from("visits")
        .update({ visit_time: time.trim() || null })
        .eq("id", item.visit.id),
    ]);
    setSaving(false);
    if (salonRes.error) { setErr(salonRes.error.message); return; }
    if (visitRes.error) { setErr(visitRes.error.message); return; }
    onSaved(item.salon.id, item.visit.id, phone.trim() || null, address.trim(), time.trim() || null);
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 dark:border-indigo-700 bg-gray-50 dark:bg-indigo-800/60 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-pink-400 dark:focus:border-pink-600 transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-screen-md rounded-t-3xl bg-white dark:bg-indigo-900 px-6 pt-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-indigo-700" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">עריכת ביקור</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-indigo-800 text-slate-400">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
        <p className="mb-4 truncate text-sm font-bold text-pink-500">{item.salon.name}</p>
        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-indigo-400">כתובת</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-indigo-400">מספר טלפון</label>
            <input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-indigo-400">שעת ביקור</label>
            <input dir="ltr" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </div>
        </div>
        {err && <p className="mb-3 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-mono text-red-600 dark:text-red-400">{err}</p>}
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
  const [cities, setCities]           = useState<City[]>([]);
  const [cityFilter, setCityFilter]   = useState<CityFilter>(null);
  // Lazy init — computed fresh from the browser's local clock, not a stale module constant
  const [agendaDate]                  = useState(getLocalToday);
  const [agenda, setAgenda]           = useState<AgendaItem[]>([]);
  const [loading, setLoading]         = useState(false);
  const [showPicker, setShowPicker]   = useState(false);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [editingItem, setEditingItem]   = useState<AgendaItem | null>(null);
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null);
  const [showNewVisit, setShowNewVisit] = useState(false);

  // Load cities (cache-first) + persisted filter
  useEffect(() => {
    let alive = true;
    const cached = appCache.get<City[]>("cities");
    if (cached) setCities(cached);
    supabase.from("cities").select("*").order("name").then(({ data }) => {
      if (!alive || !data) return;
      setCities(data);
      appCache.set("cities", data);
    });
    const saved = localStorage.getItem("shkedia_city");
    if (saved === "all") setCityFilter("all");
    else if (saved) setCityFilter(Number(saved));
    return () => { alive = false; };
  }, []);

  // ── Agenda query: visits-first ────────────────────────────────────────────
  // Only salons that have a scheduled visit for agendaDate appear.
  // Clients without a visit today are invisible here by design.
  const loadAgenda = useCallback(async (filter: number | "all", date: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data: raw, error } = await supabase
        .from("visits")
        .select("*, salons!inner(id, name, owner_name, street_address, phone_number, city_id)")
        .eq("visit_date", date)
        .order("visit_time", { ascending: true, nullsFirst: false });

      if (error) throw new Error(error.message);

      // Filter by city in JS — more reliable than PostgREST nested column filter
      const rows = (raw as VisitWithSalonJoin[] ?? [])
        .filter((v) => filter === "all" || v.salons.city_id === filter);

      if (rows.length === 0) { setAgenda([]); return; }

      // Fetch the most recent previous visit per salon for product/notes context
      const salonIds = [...new Set(rows.map((v) => v.salon_id))];
      const { data: prev } = await supabase
        .from("visits")
        .select("*")
        .in("salon_id", salonIds)
        .neq("visit_date", date)
        .order("visit_date", { ascending: false });

      const lastByS = new Map<number, Visit>();
      for (const v of (prev ?? [])) {
        if (!lastByS.has(v.salon_id)) lastByS.set(v.salon_id, v);
      }

      setAgenda(
        rows.map((v) => {
          const { salons, ...visitOnly } = v as VisitWithSalonJoin;
          return {
            visit: visitOnly as Visit,
            salon: salons,
            lastVisit: lastByS.get(v.salon_id) ?? null,
            expanded: false,
          };
        })
      );
    } catch (err: any) {
      setFetchError(err?.message ?? "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cityFilter !== null) loadAgenda(cityFilter, agendaDate);
    else setAgenda([]);
  }, [cityFilter, agendaDate, loadAgenda]);

  function selectFilter(f: CityFilter) {
    setCityFilter(f);
    localStorage.setItem("shkedia_city", f === null ? "" : String(f));
    setShowPicker(false);
  }

  function toggleExpand(visitId: number) {
    setAgenda((prev) => prev.map((a) => (a.visit.id === visitId ? { ...a, expanded: !a.expanded } : a)));
  }

  async function toggleCheck(item: AgendaItem) {
    const willComplete = !item.visit.is_completed;
    // Optimistic update
    setAgenda((prev) =>
      prev.map((a) =>
        a.visit.id === item.visit.id ? { ...a, visit: { ...a.visit, is_completed: willComplete } } : a
      )
    );
    await supabase.from("visits").update({ is_completed: willComplete }).eq("id", item.visit.id);
  }

  async function confirmDeleteVisit() {
    if (deleteVisitId === null) return;
    const id = deleteVisitId;
    setDeleteVisitId(null);
    setAgenda((prev) => prev.filter((a) => a.visit.id !== id));
    await supabase.from("visits").delete().eq("id", id);
  }

  function handleItemSaved(
    salonId: number, visitId: number,
    phone: string | null, address: string, visitTime: string | null
  ) {
    setAgenda((prev) =>
      prev.map((a) => {
        if (a.visit.id !== visitId) return a;
        return {
          ...a,
          salon: { ...a.salon, phone_number: phone, street_address: address },
          visit: { ...a.visit, visit_time: visitTime },
        };
      })
    );
    setEditingItem(null);
  }

  const defaultCityId  = typeof cityFilter === "number" ? cityFilter : undefined;
  const filterLabel    = cityFilter === "all" ? "כל הערים"
    : cityFilter !== null ? (cities.find((c) => c.id === cityFilter)?.name ?? "") : null;

  const completed = agenda.filter((a) => a.visit.is_completed).length;
  const total     = agenda.length;
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

      {/* New visit button */}
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

      {/* Empty — no city selected */}
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

      {/* Empty — city selected but no visits today */}
      {!loading && cityFilter !== null && agenda.length === 0 && !fetchError && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-800/30">
            <Clock size={28} className="text-indigo-300 dark:text-indigo-500" />
          </div>
          <p className="font-black text-slate-900 dark:text-white">אין ביקורים מתוכננים להיום</p>
          <p className="text-sm text-slate-400 dark:text-indigo-400">לחץ על "ביקור חדש" להוספת ביקור</p>
        </div>
      )}

      {/* Agenda cards */}
      {!loading && agenda.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {agenda.map((item) => {
            const { visit, salon, lastVisit, expanded } = item;
            const isCompleted = visit.is_completed;
            const time = fmtTime(visit.visit_time);
            return (
              <div
                key={visit.id}
                className={`overflow-hidden rounded-3xl border bg-white dark:bg-indigo-900/50 shadow-sm shadow-black/[0.04] dark:shadow-black/20 transition-all ${
                  isCompleted
                    ? "border-gray-100 dark:border-indigo-800/30 opacity-60"
                    : expanded
                    ? "border-pink-300 dark:border-pink-800/50"
                    : "border-gray-100 dark:border-indigo-800/30"
                }`}
              >
                {/* Card header */}
                <div
                  className="flex cursor-pointer items-center gap-3 p-3.5"
                  onClick={() => toggleExpand(visit.id)}
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleCheck(item); }}
                    aria-label={isCompleted ? "סמן כלא הושלם" : "סמן כהושלם"}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                      isCompleted ? "border-pink-500 bg-pink-500 text-white" : "border-gray-200 dark:border-indigo-700"
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
                      className={`text-slate-300 dark:text-indigo-600 transition-transform ${expanded ? "-rotate-90" : ""}`}
                    />
                  </div>
                </div>

                {/* Expanded panel */}
                {expanded && (
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
                      {lastVisit?.items_sold && (
                        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-indigo-300/70">
                          <Package size={12} className="mt-0.5 shrink-0 text-pink-400" />
                          <span><strong>אחרון: </strong>{lastVisit.items_sold}</span>
                        </div>
                      )}
                      {lastVisit?.notes && (
                        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-indigo-300/70">
                          <StickyNote size={12} className="mt-0.5 shrink-0 text-pink-400" />
                          <span>{lastVisit.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Row 1: communication */}
                      <div className="grid grid-cols-2 gap-2">
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
                      </div>
                      {/* Row 2: edit + delete */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-indigo-700 bg-white dark:bg-indigo-800/50 py-2.5 text-xs font-bold text-slate-600 dark:text-indigo-300"
                        >
                          <Pencil size={12} strokeWidth={2} />
                          ערוך
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteVisitId(visit.id); }}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 py-2.5 text-xs font-bold text-red-600 dark:text-red-400"
                        >
                          <Trash2 size={12} strokeWidth={2} />
                          מחק
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={handleItemSaved}
        />
      )}

      {/* Delete visit confirm dialog */}
      {deleteVisitId !== null && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteVisitId(null)}
        >
          <div
            className="mx-6 w-full max-w-sm rounded-3xl bg-white dark:bg-indigo-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-900 dark:text-white">מחיקת ביקור</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-indigo-400">
              האם למחוק את הביקור? פעולה זו אינה ניתנת לביטול.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeleteVisitId(null)}
                className="rounded-2xl border border-gray-200 dark:border-indigo-700 py-3 text-sm font-bold text-slate-600 dark:text-indigo-300"
              >
                ביטול
              </button>
              <button
                onClick={confirmDeleteVisit}
                className="rounded-2xl bg-red-500 py-3 text-sm font-bold text-white"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New visit modal */}
      {showNewVisit && (
        <NewVisitModal
          defaultDate={agendaDate}
          defaultCityId={defaultCityId}
          onClose={() => setShowNewVisit(false)}
          onSaved={() => {
            setShowNewVisit(false);
            if (cityFilter !== null) loadAgenda(cityFilter, agendaDate);
          }}
        />
      )}
    </>
  );
}
