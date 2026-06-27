"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, type City, type Salon } from "@/lib/supabase";
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
import {
  ChevronRight, Plus, Scissors, User, MapPin, ArrowLeft,
  Phone, Pencil, Trash2,
} from "lucide-react";

const ease = [0.32, 0.72, 0, 1] as const;
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.065 } } };
const rowVariants  = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease } },
};

type SalonForm = {
  name: string;
  owner_name: string;
  street_address: string;
  phone_number: string;
};

const emptyForm: SalonForm = { name: "", owner_name: "", street_address: "", phone_number: "" };

function salonToForm(s: Salon): SalonForm {
  return {
    name: s.name,
    owner_name: s.owner_name,
    street_address: s.street_address,
    phone_number: s.phone_number ?? "",
  };
}

/* ─── Shared form fields ─── */
function SalonFormFields({
  form,
  onChange,
}: {
  form: SalonForm;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputCls = "rounded-2xl border-gray-200 dark:border-indigo-700/50";
  const labelCls = "font-semibold text-slate-700 dark:text-indigo-200";

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="f-name" className={labelCls}>שם המספרה</Label>
        <Input id="f-name" name="name" type="text"
          placeholder="מספרת יופי של שרה"
          value={form.name} onChange={onChange} required className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="f-owner" className={labelCls}>שם הבעלים</Label>
        <Input id="f-owner" name="owner_name" type="text"
          placeholder="שרה כהן"
          value={form.owner_name} onChange={onChange} required className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="f-address" className={labelCls}>כתובת</Label>
        <Input id="f-address" name="street_address" type="text"
          placeholder="הרצל 12, קומה 2"
          value={form.street_address} onChange={onChange} required className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="f-phone" className={labelCls}>
          מספר טלפון
          <span className="mr-1 text-xs font-normal text-slate-400">(אופציונלי)</span>
        </Label>
        <Input id="f-phone" name="phone_number" type="tel"
          placeholder="0501234567"
          value={form.phone_number} onChange={onChange} className={inputCls} />
      </div>
    </>
  );
}

/* ─── Swipeable salon card ─── */
function SwipeableSalonCard({
  salon, onEdit, onDelete, onNavigate,
}: {
  salon: Salon;
  onEdit: (salon: Salon, e: React.MouseEvent) => void;
  onDelete: () => void;
  onNavigate: () => void;
}) {
  const REVEAL_W = 88;
  const [offset, setOffset]           = useState(0);
  const [isDragging, setIsDragging]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx > 0) setOffset(Math.min(dx, REVEAL_W + 12));
    else setOffset(Math.max(offset + dx * 0.1, 0));
  }

  function handleTouchEnd() {
    startX.current = null;
    setIsDragging(false);
    setOffset(offset > REVEAL_W * 0.4 ? REVEAL_W : 0);
  }

  function handleCardClick() {
    if (offset > 0) { setOffset(0); return; }
    onNavigate();
  }

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {/* Red delete area — revealed on swipe */}
      <div
        className="absolute inset-y-0 left-0 flex w-[88px] cursor-pointer items-center justify-center rounded-3xl bg-red-500"
        onClick={() => setShowConfirm(true)}
      >
        <Trash2 size={20} className="text-white" strokeWidth={2} />
      </div>

      {/* Swipeable card */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.32,0.72,0,1)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="group relative overflow-hidden rounded-3xl bg-white dark:bg-indigo-900/50 shadow-md shadow-black/[0.05] dark:shadow-black/25 transition-shadow duration-200 hover:shadow-lg"
      >
        {/* Hover actions: pencil + trash — desktop only */}
        <div
          className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => onEdit(salon, e)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 dark:text-indigo-600 transition-colors hover:bg-pink-50 dark:hover:bg-pink-950/40 hover:text-pink-500 dark:hover:text-pink-400"
            aria-label={`ערוך ${salon.name}`}
          >
            <Pencil size={14} strokeWidth={2} />
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 dark:text-indigo-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
            aria-label={`מחק ${salon.name}`}
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Navigation button */}
        <button
          onClick={handleCardClick}
          className="flex w-full items-center gap-4 p-4 text-right"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-50 dark:bg-pink-900/30">
            <Scissors size={20} strokeWidth={1.8} className="text-pink-500 dark:text-pink-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base text-indigo-950 dark:text-white truncate">{salon.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 dark:text-indigo-300/60">
              <span className="flex items-center gap-1">
                <User size={11} strokeWidth={1.8} />
                {salon.owner_name}
              </span>
              <span className="text-slate-200 dark:text-indigo-700">·</span>
              <span className="flex items-center gap-1 truncate">
                <MapPin size={11} strokeWidth={1.8} />
                {salon.street_address}
              </span>
            </div>
            {salon.phone_number && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400 dark:text-indigo-300/60">
                <Phone size={11} strokeWidth={1.8} />
                <span dir="ltr">{salon.phone_number}</span>
              </div>
            )}
          </div>
          <ArrowLeft size={16} strokeWidth={2} className="shrink-0 text-slate-300 dark:text-indigo-600 transition-colors group-hover:text-pink-400" />
        </button>
      </div>

      {/* Confirm delete dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowConfirm(false); setOffset(0); }}
        >
          <div
            className="mx-6 w-full max-w-sm rounded-3xl bg-white dark:bg-indigo-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-900 dark:text-white">מחיקת מספרה</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-indigo-400">
              האם למחוק את{" "}
              <strong className="text-slate-700 dark:text-white">{salon.name}</strong>?
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
                onClick={() => { setShowConfirm(false); onDelete(); }}
                className="rounded-2xl bg-red-500 py-3 text-sm font-bold text-white"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */
export default function CityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [city, setCity]     = useState<City | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);

  // Add
  const [addOpen, setAddOpen]   = useState(false);
  const [addForm, setAddForm]   = useState<SalonForm>(emptyForm);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [editForm, setEditForm]         = useState<SalonForm>(emptyForm);
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    const [cityRes, salonsRes] = await Promise.all([
      supabase.from("cities").select("*").eq("id", id).single(),
      supabase.from("salons").select("*").eq("city_id", id).order("name"),
    ]);
    if (cityRes.data) setCity(cityRes.data);
    if (salonsRes.data) setSalons(salonsRes.data);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [id]);

  function handleAddChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleAddSalon(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    setAddError(null);
    const { error } = await supabase.from("salons").insert({
      city_id: Number(id),
      name: addForm.name.trim(),
      owner_name: addForm.owner_name.trim(),
      street_address: addForm.street_address.trim(),
      phone_number: addForm.phone_number.trim() || null,
    });
    setAddSaving(false);
    if (error) { setAddError("שגיאה בשמירה. נסה שוב."); return; }
    setAddForm(emptyForm);
    setAddOpen(false);
    fetchData();
  }

  function openEdit(salon: Salon, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingSalon(salon);
    setEditForm(salonToForm(salon));
    setEditError(null);
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleEditSalon(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSalon) return;
    setEditSaving(true);
    setEditError(null);
    const { error } = await supabase.from("salons").update({
      name: editForm.name.trim(),
      owner_name: editForm.owner_name.trim(),
      street_address: editForm.street_address.trim(),
      phone_number: editForm.phone_number.trim() || null,
    }).eq("id", editingSalon.id);
    setEditSaving(false);
    if (error) { setEditError("שגיאה בשמירה. נסה שוב."); return; }
    setSalons((prev) =>
      prev.map((s) =>
        s.id === editingSalon.id
          ? { ...s, ...editForm, phone_number: editForm.phone_number.trim() || null }
          : s
      )
    );
    setEditingSalon(null);
  }

  async function handleDeleteSalon(salonId: number) {
    await supabase.from("salons").delete().eq("id", salonId);
    setSalons((prev) => prev.filter((s) => s.id !== salonId));
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <div className="h-5 w-24 rounded-full bg-white dark:bg-indigo-900/50 shadow animate-pulse" />
        <div className="h-12 w-52 rounded-2xl bg-white dark:bg-indigo-900/50 shadow animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[76px] rounded-3xl bg-white dark:bg-indigo-900/50 shadow-md shadow-black/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.26, ease }}
        onClick={() => router.push("/cities")}
        className="flex items-center gap-1 text-sm font-semibold text-slate-400 dark:text-indigo-300/60 hover:text-pink-500 dark:hover:text-pink-400 transition-colors w-fit"
      >
        <ChevronRight size={15} strokeWidth={2.5} />
        ערים
      </motion.button>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease }}
      >
        <h1 className="text-3xl font-black tracking-tight text-indigo-950 dark:text-white">
          {city?.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-indigo-300/70">
          {salons.length === 0 ? "אין מספרות עדיין" : `${salons.length} מספרות`}
        </p>
      </motion.div>

      {/* Add salon CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.30, delay: 0.09, ease }}
      >
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setAddForm(emptyForm); setAddError(null); } }}>
          <DialogTrigger render={
            <button className="flex w-full items-center justify-center gap-2 rounded-3xl bg-pink-500 py-3.5 text-sm font-bold text-white shadow-md shadow-pink-200 dark:shadow-pink-900/30 transition-all hover:bg-pink-600 hover:shadow-lg active:scale-[0.98]" />
          }>
            <Plus size={16} strokeWidth={2.5} />
            הוסף מספרה חדשה
          </DialogTrigger>
          <DialogContent className="max-w-sm rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-indigo-950 dark:text-white">מספרה חדשה</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSalon} className="flex flex-col gap-4 pt-1">
              <SalonFormFields form={addForm} onChange={handleAddChange} />
              {addError && <p className="text-sm text-red-500">{addError}</p>}
              <Button type="submit" disabled={addSaving}
                className="w-full rounded-2xl bg-pink-500 hover:bg-pink-600 font-bold shadow-md shadow-pink-200 dark:shadow-pink-900/30">
                {addSaving ? "שומר..." : "הוסף מספרה"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Edit dialog */}
      <Dialog
        open={!!editingSalon}
        onOpenChange={(o) => { if (!o) setEditingSalon(null); }}
      >
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-indigo-950 dark:text-white">
              עריכת מספרה
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSalon} className="flex flex-col gap-4 pt-1">
            <SalonFormFields form={editForm} onChange={handleEditChange} />
            {editError && <p className="text-sm text-red-500">{editError}</p>}
            <Button type="submit" disabled={editSaving}
              className="w-full rounded-2xl bg-pink-500 hover:bg-pink-600 font-bold shadow-md shadow-pink-200 dark:shadow-pink-900/30">
              {editSaving ? "שומר..." : "שמור שינויים"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile swipe hint */}
      {salons.length > 0 && (
        <p className="text-right text-xs text-slate-400 dark:text-indigo-600 md:hidden -mt-4">
          החלק ימינה למחיקה
        </p>
      )}

      {/* Salon list */}
      {salons.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 rounded-3xl bg-white dark:bg-indigo-900/40 py-20 text-center shadow-md shadow-black/5"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-100 dark:bg-pink-900/30">
            <Scissors size={28} strokeWidth={1.5} className="text-pink-500" />
          </div>
          <div>
            <p className="font-black text-indigo-950 dark:text-white">אין מספרות עדיין</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-indigo-300/60">הוסף את המספרה הראשונה</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={listVariants} initial="hidden" animate="show"
          className="flex flex-col gap-3"
        >
          <AnimatePresence>
            {salons.map((salon) => (
              <motion.div
                key={salon.id}
                variants={rowVariants}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
              >
                <SwipeableSalonCard
                  salon={salon}
                  onEdit={openEdit}
                  onDelete={() => handleDeleteSalon(salon.id)}
                  onNavigate={() => router.push(`/salons/${salon.id}`)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
