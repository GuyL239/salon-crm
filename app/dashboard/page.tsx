"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase, type Salon, type Visit } from "@/lib/supabase";
import {
  TrendingUp, AlertCircle, CheckCircle2,
  User, CalendarDays, ChevronLeft, Scissors,
} from "lucide-react";

// No initial opacity — only y-translate so content is always painted
const ease = [0.32, 0.72, 0, 1] as const;
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const rowVariants  = {
  hidden: { opacity: 1, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.30, ease } },
};

type SalonWithMeta = Salon & {
  lastVisitDate: string | null;
  daysSince: number | null;
};

function formatCurrency(n: number) {
  return `₪${n.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function daysBetween(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  return { start, end };
}
function hebrewMonth() {
  return new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

function SalonRow({ salon, accent }: { salon: SalonWithMeta; accent: "rose" | "emerald" }) {
  const router = useRouter();
  const daysLabel =
    salon.daysSince === null ? "לא ביקרת מעולם" :
    salon.daysSince === 0   ? "היום"             :
    salon.daysSince === 1   ? "אתמול"            :
    `לפני ${salon.daysSince} ימים`;

  const pillCls =
    accent === "rose"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  const iconCls =
    accent === "rose"
      ? "bg-rose-50 dark:bg-rose-900/20 text-rose-500"
      : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500";

  return (
    <motion.button
      variants={rowVariants}
      onClick={() => router.push(`/salons/${salon.id}`)}
      className="group flex w-full items-center gap-3 rounded-2xl bg-white dark:bg-indigo-900/50 p-3.5 text-right shadow-sm shadow-black/[0.04] dark:shadow-black/20 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <Scissors size={17} strokeWidth={1.8} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{salon.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-indigo-300/60 truncate">
          <User size={10} strokeWidth={1.8} className="shrink-0" />
          {salon.owner_name}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${pillCls}`}>
          {daysLabel}
        </span>
        <ChevronLeft size={14} strokeWidth={2} className="text-slate-300 dark:text-indigo-600 group-hover:text-pink-400 transition-colors" />
      </div>
    </motion.button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  iconCls,
  countCls,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  iconCls: string;
  countCls: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon size={15} strokeWidth={2} />
      </div>
      <h2 className="font-black text-base text-slate-900 dark:text-white">{title}</h2>
      <span className={`mr-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${countCls}`}>
        {count}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [salonsWithMeta, setSalonsWithMeta] = useState<SalonWithMeta[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const { start, end } = currentMonthRange();

        const [salonsRes, allVisitsRes, monthVisitsRes] = await Promise.all([
          supabase.from("salons").select("*").order("name"),
          supabase.from("visits").select("salon_id, visit_date").order("visit_date", { ascending: false }),
          supabase.from("visits").select("deal_amount").gte("visit_date", start).lte("visit_date", end),
        ]);

        if (salonsRes.error) throw new Error(salonsRes.error.message);

        const revenue = (monthVisitsRes.data ?? []).reduce(
          (sum, v) => sum + (v.deal_amount ?? 0), 0
        );
        setMonthRevenue(revenue);

        const latestBySalon = new Map<number, string>();
        for (const v of (allVisitsRes.data ?? [])) {
          if (!latestBySalon.has(v.salon_id)) latestBySalon.set(v.salon_id, v.visit_date);
        }

        const enriched: SalonWithMeta[] = (salonsRes.data ?? []).map((s) => {
          const last = latestBySalon.get(s.id) ?? null;
          return { ...s, lastVisitDate: last, daysSince: last ? daysBetween(last) : null };
        });

        setSalonsWithMeta(enriched);
      } catch (err: any) {
        setLoadError(err?.message ?? "Unknown network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cold   = salonsWithMeta.filter((s) => s.daysSince === null || s.daysSince > 30);
  const active = salonsWithMeta.filter((s) => s.daysSince !== null && s.daysSince <= 30);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
        <p className="text-sm font-semibold text-slate-500 dark:text-indigo-300/70">טוען נתונים...</p>
      </div>
    );
  }

  /* ── Error state ── */
  if (loadError) {
    return (
      <div className="rounded-3xl border-2 border-red-300 bg-red-50 p-5 shadow-md">
        <p className="font-black text-red-700">שגיאה בטעינת הנתונים</p>
        <p className="mt-2 break-all font-mono text-xs text-red-600">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">

      {/* ── Monthly Revenue Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-indigo-900/50 shadow-xl shadow-black/[0.08] dark:shadow-black/30 p-6">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-10 -left-10 h-48 w-48 rounded-full bg-pink-500/10 dark:bg-pink-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 blur-2xl" />

        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-indigo-300/60">
                הכנסות החודש
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-indigo-500">
                {hebrewMonth()}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 dark:bg-pink-900/30">
              <TrendingUp size={18} strokeWidth={2} className="text-pink-500" />
            </div>
          </div>

          <p className="mt-5 text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(monthRevenue)}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                פעילים
              </p>
              <p className="mt-0.5 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {active.length}
              </p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500">סלונים</p>
            </div>
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">
                זקוקים לתשומת לב
              </p>
              <p className="mt-0.5 text-2xl font-black text-rose-600 dark:text-rose-300">
                {cold.length}
              </p>
              <p className="text-[10px] text-rose-500/70 dark:text-rose-500">סלונים</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cold salons ── */}
      {cold.length > 0 && (
        <section>
          <SectionHeader
            icon={AlertCircle}
            title="זקוקים לתשומת לב"
            count={cold.length}
            iconCls="bg-rose-50 dark:bg-rose-900/20 text-rose-500"
            countCls="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
          />
          <motion.div
            variants={listVariants} initial="hidden" animate="show"
            className="flex flex-col gap-2"
          >
            {cold.map((s) => <SalonRow key={s.id} salon={s} accent="rose" />)}
          </motion.div>
        </section>
      )}

      {/* ── Active salons ── */}
      {active.length > 0 && (
        <section>
          <SectionHeader
            icon={CheckCircle2}
            title="פעילים"
            count={active.length}
            iconCls="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"
            countCls="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          />
          <motion.div
            variants={listVariants} initial="hidden" animate="show"
            className="flex flex-col gap-2"
          >
            {active.map((s) => <SalonRow key={s.id} salon={s} accent="emerald" />)}
          </motion.div>
        </section>
      )}

      {/* ── Empty state ── */}
      {salonsWithMeta.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white dark:bg-indigo-900/40 py-20 text-center shadow-md shadow-black/5">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-100 dark:bg-pink-900/30">
            <CalendarDays size={28} strokeWidth={1.5} className="text-pink-500" />
          </div>
          <div>
            <p className="font-black text-slate-900 dark:text-white">אין נתונים עדיין</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-indigo-300/60">הוסף ערים וסלונים כדי לראות סיכום</p>
          </div>
        </div>
      )}
    </div>
  );
}
