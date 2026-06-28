"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type City } from "@/lib/supabase";
import { appCache } from "@/lib/cache";
import { Plus, ChevronLeft, Trash2, X } from "lucide-react";

const TINTS = [
  { bg: "bg-pink-50 dark:bg-pink-950/30",       text: "text-pink-600 dark:text-pink-300" },
  { bg: "bg-sky-50 dark:bg-sky-950/30",         text: "text-sky-600 dark:text-sky-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-300" },
  { bg: "bg-violet-50 dark:bg-violet-950/30",   text: "text-violet-600 dark:text-violet-300" },
  { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-600 dark:text-amber-300" },
] as const;

// ─── Add City Sheet ───────────────────────────────────────────────────────────

function AddCitySheet({ onClose, onSaved }: { onClose: () => void; onSaved: (city: City) => void }) {
  const [name, setName]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input when the sheet opens
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setErr("יש להזין שם עיר"); return; }
    setSaving(true);
    setErr(null);
    const { data, error } = await supabase
      .from("cities")
      .insert({ name: trimmed })
      .select()
      .single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved(data as City);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-screen-md rounded-t-3xl bg-white dark:bg-indigo-900 px-6 pt-5 pb-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-indigo-700" />

        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">הוספת עיר</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-indigo-800 text-slate-400 dark:text-indigo-300"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-indigo-400">
            שם העיר
          </label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => { setName(e.target.value); setErr(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="למשל: תל אביב"
            className="w-full rounded-xl border border-gray-200 dark:border-indigo-700 bg-gray-50 dark:bg-indigo-800/60 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-pink-400 dark:focus:border-pink-600 transition-colors"
          />
        </div>

        {err && (
          <p className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-mono text-red-600 dark:text-red-400">
            {err}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="rounded-2xl border border-gray-200 dark:border-indigo-700 py-3 text-sm font-bold text-slate-600 dark:text-indigo-300"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl bg-pink-500 py-3 text-sm font-bold text-white shadow-md shadow-pink-200 dark:shadow-pink-900/30 disabled:opacity-60"
          >
            {saving ? "שומר..." : "הוסף עיר"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Swipeable city row ───────────────────────────────────────────────────────

function CityRow({
  city, index, onDelete,
}: {
  city: City;
  index: number;
  onDelete: (id: number) => Promise<string | null>;
}) {
  const router = useRouter();
  const t = TINTS[index % TINTS.length];

  const REVEAL_W = 88;
  const [offset, setOffset]           = useState(0);
  const [isDragging, setIsDragging]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [deleteErr, setDeleteErr]     = useState<string | null>(null);
  const startX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx > 0) setOffset(Math.min(dx, REVEAL_W + 12));
    else setOffset(Math.max(offset + (dx * 0.1), 0));
  }

  function onTouchEnd() {
    startX.current = null;
    setIsDragging(false);
    setOffset(offset > REVEAL_W * 0.4 ? REVEAL_W : 0);
  }

  function handleCardClick() {
    if (offset > 0) { setOffset(0); return; }
    router.push(`/cities/${city.id}`);
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    const err = await onDelete(city.id);
    setDeleting(false);
    if (err) {
      setDeleteErr(err);
      setShowConfirm(false);
      setOffset(0);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div
        className="absolute inset-y-0 left-0 flex w-[88px] cursor-pointer items-center justify-center rounded-3xl bg-red-500"
        onClick={() => setShowConfirm(true)}
      >
        <Trash2 size={20} className="text-white" strokeWidth={2} />
      </div>

      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.32,0.72,0,1)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCardClick}
        className="relative flex cursor-pointer items-center gap-4 rounded-3xl border border-gray-100 dark:border-indigo-800/30 bg-white dark:bg-indigo-900/50 p-4 text-right shadow-sm"
      >
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${t.bg} ${t.text}`}>
          {city.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-900 dark:text-white">{city.name}</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-indigo-400">לחץ לצפייה בסלונים</p>
        </div>
        <button
          className="hidden md:flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
        >
          <Trash2 size={15} strokeWidth={1.8} />
        </button>
        <ChevronLeft size={16} strokeWidth={2} className="shrink-0 text-gray-300 dark:text-indigo-600" />
      </div>

      {deleteErr && (
        <div className="mt-1 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {deleteErr}
        </div>
      )}

      {showConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowConfirm(false); setOffset(0); }}
        >
          <div
            className="mx-6 w-full max-w-sm rounded-3xl bg-white dark:bg-indigo-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-900 dark:text-white">מחיקת עיר</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-indigo-400">
              האם למחוק את <strong className="text-slate-700 dark:text-white">{city.name}</strong>?
              <br />פעולה זו אינה ניתנת לביטול.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowConfirm(false); setOffset(0); }}
                className="rounded-2xl border border-gray-200 dark:border-indigo-700 py-3 text-sm font-bold text-slate-600 dark:text-indigo-300"
              >
                ביטול
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-2xl bg-red-500 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {deleting ? "מוחק..." : "מחק"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cities Page ──────────────────────────────────────────────────────────────

export default function CitiesPage() {
  const [cities, setCities]         = useState<City[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => {
    let alive = true;
    const cached = appCache.get<City[]>("cities");
    if (cached) { setCities(cached); setLoading(false); }
    supabase.from("cities").select("*").order("name").then(({ data, error }) => {
      if (!alive) return;
      if (error) { if (!cached) setFetchError(error.message); }
      else { setCities(data ?? []); appCache.set("cities", data ?? []); }
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  async function handleDelete(cityId: number): Promise<string | null> {
    const { error } = await supabase.from("cities").delete().eq("id", cityId);
    if (error) return error.message;
    setCities((prev) => {
      const next = prev.filter((c) => c.id !== cityId);
      appCache.set("cities", next);
      return next;
    });
    return null;
  }

  function handleCityAdded(city: City) {
    setCities((prev) => {
      const next = [...prev, city].sort((a, b) => a.name.localeCompare(b.name, "he"));
      appCache.set("cities", next);
      return next;
    });
    setShowAddSheet(false);
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">ערים</h1>
        <button
          onClick={() => setShowAddSheet(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-pink-50 dark:bg-pink-950/30 px-4 py-2 text-xs font-bold text-pink-600 dark:text-pink-300"
        >
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

      {!loading && cities.length > 0 && (
        <p className="mb-2 text-right text-xs text-slate-400 dark:text-indigo-600 md:hidden">
          החלק ימינה למחיקת עיר
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {cities.map((city, i) => (
          <CityRow
            key={city.id}
            city={city}
            index={i}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {showAddSheet && (
        <AddCitySheet
          onClose={() => setShowAddSheet(false)}
          onSaved={handleCityAdded}
        />
      )}
    </>
  );
}
