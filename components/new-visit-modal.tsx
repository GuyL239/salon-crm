"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase, type City, type Salon } from "@/lib/supabase";

interface Props {
  defaultDate?: string;
  defaultCityId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export function NewVisitModal({ defaultDate, defaultCityId, onClose, onSaved }: Props) {
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();

  const [cities, setCities]   = useState<City[]>([]);
  const [salons, setSalons]   = useState<Salon[]>([]);
  const [cityId, setCityId]   = useState<number | "">(defaultCityId ?? "");
  const [salonId, setSalonId] = useState<number | "">("");
  const [date, setDate]       = useState(defaultDate ?? today);
  const [time, setTime]       = useState("09:00");
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  useEffect(() => {
    supabase.from("cities").select("*").order("name").then(({ data }) => {
      if (data) setCities(data);
    });
  }, []);

  useEffect(() => {
    if (!cityId) { setSalons([]); setSalonId(""); return; }
    supabase
      .from("salons")
      .select("*")
      .eq("city_id", cityId)
      .order("name")
      .then(({ data }) => { setSalons(data ?? []); setSalonId(""); });
  }, [cityId]);

  async function handleSave() {
    if (!salonId || !date || !time) { setErr("יש למלא עיר, לקוח, תאריך ושעה"); return; }
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("visits").insert({
      salon_id: Number(salonId),
      visit_date: date,
      visit_time: time,
      is_completed: false,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 dark:border-indigo-700 bg-gray-50 dark:bg-indigo-800/60 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-pink-400 dark:focus:border-pink-600 transition-colors";

  const labelCls = "mb-1 block text-xs font-bold text-slate-500 dark:text-indigo-400";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-screen-md rounded-t-3xl bg-white dark:bg-indigo-900 px-6 pt-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-indigo-700" />

        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">ביקור חדש</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-indigo-800 text-slate-400 dark:text-indigo-300"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col gap-3 mb-5">
          {/* City */}
          <div>
            <label className={labelCls}>עיר</label>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : "")}
              className={inputCls}
            >
              <option value="">בחר עיר...</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Salon / Client — filtered by city */}
          <div>
            <label className={labelCls}>לקוח / סלון</label>
            <select
              value={salonId}
              onChange={(e) => setSalonId(e.target.value ? Number(e.target.value) : "")}
              disabled={!cityId}
              className={`${inputCls} disabled:opacity-50`}
            >
              <option value="">{cityId ? "בחר לקוח..." : "בחר עיר תחילה"}</option>
              {salons.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.owner_name}</option>
              ))}
            </select>
          </div>

          {/* Date + Time side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>תאריך</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>שעה</label>
              <input
                dir="ltr"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {err && (
          <p className="mb-3 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-mono text-red-600 dark:text-red-400">
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
            {saving ? "שומר..." : "שמור ביקור"}
          </button>
        </div>
      </div>
    </div>
  );
}
