"use client";

import { useEffect, useState } from "react";
import { supabase, type Visit } from "@/lib/supabase";
import { NewVisitModal } from "@/components/new-visit-modal";
import { ChevronLeft, ChevronRight, Plus, X, Clock } from "lucide-react";

const TODAY = new Date().toISOString().split("T")[0];

const HE_MONTHS = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר",
];
const DAY_NAMES = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];

type VisitWithSalon = Visit & {
  salons: { name: string; owner_name: string } | null;
};

function fmtTime(t: string | null | undefined) {
  if (!t) return null;
  return t.substring(0, 5);
}

function formatSelectedDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long",
  });
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [visitDates, setVisitDates]   = useState<Set<string>>(new Set());
  const [calLoading, setCalLoading]   = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(TODAY);
  const [dateVisits, setDateVisits]     = useState<VisitWithSalon[]>([]);
  const [dateLoading, setDateLoading]   = useState(false);

  const [showNewVisit, setShowNewVisit] = useState(false);

  // Fetch visit dot coverage for the visible month
  useEffect(() => {
    setCalLoading(true);
    const mm  = String(month + 1).padStart(2, "0");
    const end = new Date(year, month + 1, 0).getDate();
    supabase
      .from("visits")
      .select("visit_date")
      .gte("visit_date", `${year}-${mm}-01`)
      .lte("visit_date", `${year}-${mm}-${String(end).padStart(2, "0")}`)
      .then(({ data }) => {
        setVisitDates(new Set((data ?? []).map((v) => v.visit_date)));
        setCalLoading(false);
      });
  }, [year, month]);

  // Fetch full visit details for the selected date
  useEffect(() => {
    if (!selectedDate) { setDateVisits([]); return; }
    setDateLoading(true);
    supabase
      .from("visits")
      .select("*, salons(name, owner_name)")
      .eq("visit_date", selectedDate)
      .order("visit_time", { ascending: true })
      .then(({ data }) => {
        setDateVisits((data as VisitWithSalon[]) ?? []);
        setDateLoading(false);
      });
  }, [selectedDate]);

  function prevMonth() {
    if (month > 0) setMonth((m) => m - 1);
    else { setMonth(11); setYear((y) => y - 1); }
  }
  function nextMonth() {
    if (month < 11) setMonth((m) => m + 1);
    else { setMonth(0); setYear((y) => y + 1); }
  }

  function handleNewVisitSaved() {
    setShowNewVisit(false);
    // Refresh both dots and date visit list
    const mm  = String(month + 1).padStart(2, "0");
    const end = new Date(year, month + 1, 0).getDate();
    supabase
      .from("visits").select("visit_date")
      .gte("visit_date", `${year}-${mm}-01`)
      .lte("visit_date", `${year}-${mm}-${String(end).padStart(2, "0")}`)
      .then(({ data }) => setVisitDates(new Set((data ?? []).map((v) => v.visit_date))));
    if (selectedDate) {
      supabase
        .from("visits").select("*, salons(name, owner_name)")
        .eq("visit_date", selectedDate).order("visit_time", { ascending: true })
        .then(({ data }) => setDateVisits((data as VisitWithSalon[]) ?? []));
    }
  }

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <>
      {/* Month navigation */}
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

      {/* Day name headers */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-bold text-slate-300 dark:text-indigo-600">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {calLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d       = i + 1;
            const mm      = String(month + 1).padStart(2, "0");
            const dateStr = `${year}-${mm}-${String(d).padStart(2, "0")}`;
            const isToday    = dateStr === TODAY;
            const isSelected = dateStr === selectedDate;
            const hasVisit   = visitDates.has(dateStr);
            return (
              <div
                key={d}
                className="flex cursor-pointer flex-col items-center py-0.5"
                onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                  isSelected && !isToday
                    ? "bg-pink-100 dark:bg-pink-900/40 font-bold text-pink-600 dark:text-pink-300"
                    : isToday
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

      {/* Selected-date visit list */}
      {selectedDate && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {formatSelectedDate(selectedDate)}
            </p>
            <div className="flex items-center gap-2">
              {/* New appointment for this date */}
              <button
                onClick={() => setShowNewVisit(true)}
                className="flex items-center gap-1.5 rounded-xl bg-pink-500 px-3 py-1.5 text-xs font-bold text-white"
              >
                <Plus size={12} strokeWidth={2.5} />
                פגישה חדשה
              </button>
              <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600">
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {dateLoading && (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
            </div>
          )}

          {!dateLoading && dateVisits.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-indigo-800/50 py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-indigo-500">אין ביקורים בתאריך זה</p>
              <button
                onClick={() => setShowNewVisit(true)}
                className="mt-3 text-xs font-bold text-pink-500 hover:text-pink-600"
              >
                + הוסף ביקור לתאריך זה
              </button>
            </div>
          )}

          {!dateLoading && dateVisits.length > 0 && (
            <div className="flex flex-col gap-2">
              {dateVisits.map((v) => {
                const time = fmtTime(v.visit_time);
                return (
                  <div key={v.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 dark:border-indigo-800/30 bg-white dark:bg-indigo-900/50 p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-50 dark:bg-pink-950/30 text-sm font-black text-pink-600 dark:text-pink-300">
                      {v.salons?.name?.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {v.salons?.name ?? "סלון לא ידוע"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-indigo-400 truncate">
                        {v.salons?.owner_name}
                      </p>
                      {v.items_sold && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-indigo-300/70 truncate">
                          {v.items_sold}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {time && (
                        <span className="flex items-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-800/50 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-300" dir="ltr">
                          <Clock size={10} strokeWidth={2} />
                          {time}
                        </span>
                      )}
                      {v.deal_amount ? (
                        <span className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          ₪{v.deal_amount.toLocaleString("he-IL")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New visit modal — date pre-filled to selected date */}
      {showNewVisit && (
        <NewVisitModal
          defaultDate={selectedDate ?? TODAY}
          onClose={() => setShowNewVisit(false)}
          onSaved={handleNewVisitSaved}
        />
      )}
    </>
  );
}
