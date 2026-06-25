"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase, type City } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Plus, MapPin, ArrowLeft } from "lucide-react";

/* ─── Animation ─── */
// No initial opacity — content is always visible; only translate animates in
const ease = [0.32, 0.72, 0, 1] as const;
const cardVariants = {
  hidden: { opacity: 1, y: 20 },   // opacity stays 1; only y slides up
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const CARD_TINTS = [
  "from-pink-50 to-rose-50   dark:from-pink-950/30   dark:to-rose-950/30",
  "from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30",
  "from-sky-50 to-cyan-50    dark:from-sky-950/30    dark:to-cyan-950/30",
  "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
  "from-amber-50 to-orange-50 dark:from-amber-950/30  dark:to-orange-950/30",
  "from-fuchsia-50 to-purple-50 dark:from-fuchsia-950/30 dark:to-purple-950/30",
];
const CARD_ICON_RING = [
  "bg-pink-100   dark:bg-pink-900/40   text-pink-600   dark:text-pink-300",
  "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300",
  "bg-sky-100    dark:bg-sky-900/40    text-sky-600    dark:text-sky-300",
  "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300",
  "bg-amber-100  dark:bg-amber-900/40  text-amber-600  dark:text-amber-300",
  "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-300",
];

export default function HomePage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function fetchCities() {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error: sbError } = await supabase.from("cities").select("*").order("name");
      if (sbError) throw new Error(sbError.message);
      setCities(data ?? []);
    } catch (err: any) {
      setFetchError(err?.message ?? "Unknown network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCities(); }, []);

  async function handleAddCity(e: React.FormEvent) {
    e.preventDefault();
    if (!newCityName.trim()) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("cities").insert({ name: newCityName.trim() });
    setSaving(false);
    if (error) { setError("שגיאה בשמירה. נסה שוב."); return; }
    setNewCityName("");
    setOpen(false);
    fetchCities();
  }

  async function handleDeleteCity(id: number) {
    await supabase.from("cities").delete().eq("id", id);
    setCities((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-7">

      {/* Hero header */}
      <div className="pt-2 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-500 shadow-lg shadow-pink-200 dark:shadow-pink-900/40">
          <MapPin size={28} strokeWidth={1.8} className="text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-indigo-950 dark:text-white">
          ערים
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-indigo-300/70">
          בחר עיר לצפייה בסלונים שלך
        </p>
      </div>

      {/* Add city CTA */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={
          <button className="flex w-full items-center justify-center gap-2 rounded-3xl bg-pink-500 py-4 text-sm font-bold text-white shadow-md shadow-pink-200 dark:shadow-pink-900/30 transition-all duration-200 hover:bg-pink-600 hover:shadow-lg active:scale-[0.98]" />
        }>
          <Plus size={17} strokeWidth={2.5} />
          הוסף עיר חדשה
        </DialogTrigger>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-indigo-950 dark:text-white">עיר חדשה</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCity} className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city-name" className="font-semibold text-slate-700 dark:text-indigo-200">שם העיר</Label>
              <Input id="city-name" placeholder="לדוגמה: תל אביב" value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)} autoFocus required
                className="rounded-2xl border-gray-200 dark:border-indigo-700/50" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={saving}
              className="w-full rounded-2xl bg-pink-500 hover:bg-pink-600 font-bold shadow-md shadow-pink-200 dark:shadow-pink-900/30">
              {saving ? "שומר..." : "הוסף"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* City cards */}
      {loading ? (
        /* ── Loading state ── */
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
          <p className="text-sm font-semibold text-slate-500 dark:text-indigo-300/70">טוען נתונים...</p>
        </div>
      ) : fetchError ? (
        /* ── Fetch error — shows exact message on mobile ── */
        <div className="rounded-3xl border-2 border-red-300 bg-red-50 p-5 shadow-md">
          <p className="font-black text-red-700">שגיאה בטעינת הנתונים</p>
          <p className="mt-2 break-all font-mono text-xs text-red-600">{fetchError}</p>
          <button
            onClick={fetchCities}
            className="mt-4 rounded-2xl bg-red-500 px-4 py-2 text-sm font-bold text-white"
          >
            נסה שוב
          </button>
        </div>
      ) : cities.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white dark:bg-indigo-900/40 py-20 text-center shadow-md shadow-black/5">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-100 dark:bg-pink-900/30">
            <MapPin size={28} strokeWidth={1.5} className="text-pink-500" />
          </div>
          <div>
            <p className="font-black text-indigo-950 dark:text-white">אין ערים עדיין</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-indigo-300/60">לחץ על "הוסף עיר חדשה" כדי להתחיל</p>
          </div>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3"
        >
          <AnimatePresence>
            {cities.map((city, i) => {
              const tint = CARD_TINTS[i % CARD_TINTS.length];
              const iconRing = CARD_ICON_RING[i % CARD_ICON_RING.length];
              const featured = i === 0;

              return (
                <motion.div
                  key={city.id}
                  variants={cardVariants}
                  exit={{ opacity: 1, scale: 0.94, transition: { duration: 0.2 } }}
                  className={featured ? "col-span-2" : "col-span-1"}
                >
                  <div className={[
                    "group relative overflow-hidden rounded-3xl bg-gradient-to-br",
                    tint,
                    "shadow-md shadow-black/[0.06] dark:shadow-black/25",
                    "transition-all duration-250 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 active:translate-y-0 active:shadow-md",
                  ].join(" ")}>

                    {/* Delete — top-left on hover */}
                    <div
                      className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ConfirmDelete label={city.name} onConfirm={() => handleDeleteCity(city.id)} />
                    </div>

                    <button
                      className="w-full text-right p-5 pb-6"
                      onClick={() => router.push(`/cities/${city.id}`)}
                    >
                      <div
                        className={[
                          "mb-4 inline-flex items-center justify-center rounded-2xl font-black",
                          iconRing,
                        ].join(" ")}
                        style={{ height: featured ? "3.25rem" : "2.75rem", width: featured ? "3.25rem" : "2.75rem", fontSize: featured ? "1.25rem" : "1.125rem" }}
                      >
                        {city.name.charAt(0)}
                      </div>

                      <p className={[
                        "font-black tracking-tight text-indigo-950 dark:text-white",
                        featured ? "text-2xl" : "text-lg",
                      ].join(" ")}>
                        {city.name}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-indigo-300/60">
                        גוש דן
                      </p>

                      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-950 dark:text-white backdrop-blur-sm transition-colors group-hover:bg-white dark:group-hover:bg-white/20">
                        לסלונים
                        <ArrowLeft size={11} strokeWidth={2.5} />
                      </div>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && cities.length > 0 && (
        <p className="text-center text-xs font-medium text-slate-300 dark:text-indigo-700">
          {cities.length} {cities.length === 1 ? "עיר" : "ערים"} במחוז
        </p>
      )}
    </div>
  );
}
