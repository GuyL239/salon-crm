"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { supabase, type Visit } from "@/lib/supabase";

interface Props {
  visit: Visit;
  salonName: string;
  onClose: () => void;
  onSaved: (updated: Visit) => void;
}

export function EditVisitModal({ visit, salonName, onClose, onSaved }: Props) {
  const [time, setTime]     = useState(visit.visit_time ? visit.visit_time.substring(0, 5) : "");
  const [items, setItems]   = useState(visit.items_sold ?? "");
  const [amount, setAmount] = useState(visit.deal_amount != null ? String(visit.deal_amount) : "");
  const [notes, setNotes]   = useState(visit.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("visits").update({
      visit_time:  time.trim() || null,
      items_sold:  items.trim() || null,
      deal_amount: amount.trim() ? Number(amount) : null,
      notes:       notes.trim() || null,
    }).eq("id", visit.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved({
      ...visit,
      visit_time:  time.trim() || null,
      items_sold:  items.trim() || null,
      deal_amount: amount.trim() ? Number(amount) : null,
      notes:       notes.trim() || null,
    });
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
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-indigo-700" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">עריכת ביקור</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-indigo-800 text-slate-400 dark:text-indigo-300"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
        <p className="mb-4 truncate text-sm font-bold text-pink-500">{salonName}</p>

        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className={labelCls}>שעת ביקור</label>
            <input dir="ltr" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>מוצרים שנמכרו</label>
            <input value={items} onChange={(e) => setItems(e.target.value)} placeholder="שמפו, מרכך..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>סכום עסקה (₪)</label>
            <input dir="ltr" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>הערות</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערות לביקור..." className={inputCls} />
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
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}
