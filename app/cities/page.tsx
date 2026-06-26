"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type City } from "@/lib/supabase";
import { Plus, ChevronLeft } from "lucide-react";

const TINTS = [
  { bg: "bg-pink-50 dark:bg-pink-950/30",       text: "text-pink-600 dark:text-pink-300" },
  { bg: "bg-sky-50 dark:bg-sky-950/30",         text: "text-sky-600 dark:text-sky-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-300" },
  { bg: "bg-violet-50 dark:bg-violet-950/30",   text: "text-violet-600 dark:text-violet-300" },
  { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-600 dark:text-amber-300" },
] as const;

export default function CitiesPage() {
  const router = useRouter();
  const [cities, setCities]       = useState<City[]>([]);
  const [loading, setLoading]     = useState(true);
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
    <>
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
    </>
  );
}
