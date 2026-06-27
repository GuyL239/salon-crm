"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, type Salon, type Visit } from "@/lib/supabase";
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
import { Textarea } from "@/components/ui/textarea";
import { MicButton } from "@/components/mic-button";
import {
  ChevronRight, ChevronLeft, Plus, Scissors, User, MapPin,
  CalendarDays, Briefcase, StickyNote, Clock,
  Phone, Navigation, ShoppingBag, Banknote, Pencil, Trash2, X,
} from "lucide-react";

const ease = [0.32, 0.72, 0, 1] as const;
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.34, ease } },
};

// Local-timezone date (avoids midnight UTC bug)
function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─── Types ─── */
type VisitForm = {
  visit_date: string;
  deal_amount: string;
  items_sold: string;
  last_offer_description: string;
  notes: string;
};

type SalonForm = {
  name: string;
  owner_name: string;
  street_address: string;
  phone_number: string;
};

function emptyVisitForm(): VisitForm {
  return { visit_date: getLocalToday(), deal_amount: "", items_sold: "", last_offer_description: "", notes: "" };
}

function visitToForm(v: Visit): VisitForm {
  return {
    visit_date: v.visit_date,
    deal_amount: v.deal_amount != null ? String(v.deal_amount) : "",
    items_sold: v.items_sold ?? "",
    last_offer_description: v.last_offer_description ?? "",
    notes: v.notes ?? "",
  };
}

/* ─── Helpers ─── */
function formatCurrency(amount: number) {
  return `₪${amount.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}
function daysSince(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days === 0) return "היום";
  if (days === 1) return "אתמול";
  return `לפני ${days} ימים`;
}
function urgencyChip(d: string): { label: string; classes: string } {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  const label = daysSince(d);
  if (days <= 7)  return { label, classes: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" };
  if (days <= 30) return { label, classes: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" };
  return               { label, classes: "bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400" };
}

/* ─── Shared visit form fields ─── */
function VisitFormFields({
  form, onChange, onAppend,
}: {
  form: VisitForm;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onAppend: (field: keyof VisitForm, text: string) => void;
}) {
  const inputCls = "rounded-2xl border-gray-200 dark:border-indigo-700/50";
  const labelCls = "font-semibold text-slate-700 dark:text-indigo-200";
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vf-date" className={labelCls}>תאריך</Label>
        <Input id="vf-date" name="visit_date" type="date"
          value={form.visit_date} onChange={onChange} required className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vf-amount" className={labelCls}>
            סכום עסקה <span className="text-xs font-normal text-slate-400">(₪)</span>
          </Label>
          <Input id="vf-amount" name="deal_amount" type="number" min="0" step="0.01"
            placeholder="0" value={form.deal_amount} onChange={onChange} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vf-items" className={labelCls}>פריטים</Label>
          <Input id="vf-items" name="items_sold"
            placeholder="שמפו, תרסיס..." value={form.items_sold} onChange={onChange} className={inputCls} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="vf-offer" className={labelCls}>הצעה שהוצגה</Label>
          <MicButton onResult={(t) => onAppend("last_offer_description", t)} />
        </div>
        <Input id="vf-offer" name="last_offer_description"
          placeholder="חבילת צבע + טיפול" value={form.last_offer_description} onChange={onChange} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="vf-notes" className={labelCls}>הערות</Label>
          <MicButton onResult={(t) => onAppend("notes", t)} />
        </div>
        <Textarea id="vf-notes" name="notes"
          placeholder="הערות חופשיות..." value={form.notes} onChange={onChange}
          rows={3} className={`resize-none ${inputCls}`} />
      </div>
    </>
  );
}

/* ─── Edit Salon bottom-sheet ─── */
function EditSalonSheet({
  salon, onClose, onSaved,
}: {
  salon: Salon;
  onClose: () => void;
  onSaved: (updated: Salon) => void;
}) {
  const [form, setForm] = useState<SalonForm>({
    name: salon.name,
    owner_name: salon.owner_name,
    street_address: salon.street_address,
    phone_number: salon.phone_number ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const inputCls = "w-full rounded-xl border border-gray-200 dark:border-indigo-700 bg-gray-50 dark:bg-indigo-800/60 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-pink-400 dark:focus:border-pink-600 transition-colors";
  const labelCls = "mb-1 block text-xs font-bold text-slate-500 dark:text-indigo-400";

  async function handleSave() {
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("salons").update({
      name: form.name.trim(),
      owner_name: form.owner_name.trim(),
      street_address: form.street_address.trim(),
      phone_number: form.phone_number.trim() || null,
    }).eq("id", salon.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved({ ...salon, ...form, phone_number: form.phone_number.trim() || null });
  }

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
          <h3 className="text-lg font-black text-slate-900 dark:text-white">עריכת פרטי מספרה</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-indigo-800 text-slate-400">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className={labelCls}>שם המספרה</label>
            <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>שם הבעלים</label>
            <input value={form.owner_name} onChange={(e) => setForm(p => ({ ...p, owner_name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>כתובת</label>
            <input value={form.street_address} onChange={(e) => setForm(p => ({ ...p, street_address: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>מספר טלפון</label>
            <input dir="ltr" value={form.phone_number} onChange={(e) => setForm(p => ({ ...p, phone_number: e.target.value }))} className={inputCls} />
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

/* ─── Delete confirm dialog ─── */
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="mx-6 w-full max-w-sm rounded-3xl bg-white dark:bg-indigo-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-black text-slate-900 dark:text-white">מחיקת ביקור</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-indigo-400">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="rounded-2xl border border-gray-200 dark:border-indigo-700 py-3 text-sm font-bold text-slate-600 dark:text-indigo-300">ביטול</button>
          <button onClick={onConfirm} className="rounded-2xl bg-red-500 py-3 text-sm font-bold text-white">מחק</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function SalonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [salon, setSalon]   = useState<Salon | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  // Add visit
  const [addOpen, setAddOpen]   = useState(false);
  const [addForm, setAddForm]   = useState<VisitForm>(emptyVisitForm);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit visit (rich form with mic support)
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editForm, setEditForm]         = useState<VisitForm>(emptyVisitForm);
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState<string | null>(null);

  // Delete visit
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null);

  // Expand visit cards (for tap-to-reveal edit/delete on mobile)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Edit salon details
  const [editSalonOpen, setEditSalonOpen] = useState(false);

  async function fetchData() {
    setLoading(true);
    const [salonRes, visitsRes] = await Promise.all([
      supabase.from("salons").select("*").eq("id", id).single(),
      supabase.from("visits").select("*").eq("salon_id", id).order("visit_date", { ascending: false }),
    ]);
    if (salonRes.data) setSalon(salonRes.data);
    if (visitsRes.data) setVisits(visitsRes.data);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [id]);

  /* Add */
  function handleAddChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }
  function handleAddAppend(field: keyof VisitForm, text: string) {
    setAddForm((prev) => ({ ...prev, [field]: prev[field] ? prev[field] + " " + text : text }));
  }
  async function handleAddVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.visit_date) return;
    setAddSaving(true);
    setAddError(null);
    const { error } = await supabase.from("visits").insert({
      salon_id: Number(id),
      visit_date: addForm.visit_date,
      deal_amount: addForm.deal_amount ? Number(addForm.deal_amount) : null,
      items_sold: addForm.items_sold.trim() || null,
      last_offer_description: addForm.last_offer_description.trim() || null,
      notes: addForm.notes.trim() || null,
    });
    setAddSaving(false);
    if (error) { setAddError("שגיאה בשמירה. נסה שוב."); return; }
    setAddForm(emptyVisitForm());
    setAddOpen(false);
    fetchData();
  }

  /* Edit visit */
  function openEditVisit(visit: Visit) {
    setEditingVisit(visit);
    setEditForm(visitToForm(visit));
    setEditError(null);
  }
  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }
  function handleEditAppend(field: keyof VisitForm, text: string) {
    setEditForm((prev) => ({ ...prev, [field]: prev[field] ? prev[field] + " " + text : text }));
  }
  async function handleEditVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVisit) return;
    setEditSaving(true);
    setEditError(null);
    const { error } = await supabase.from("visits").update({
      visit_date: editForm.visit_date,
      deal_amount: editForm.deal_amount ? Number(editForm.deal_amount) : null,
      items_sold: editForm.items_sold.trim() || null,
      last_offer_description: editForm.last_offer_description.trim() || null,
      notes: editForm.notes.trim() || null,
    }).eq("id", editingVisit.id);
    setEditSaving(false);
    if (error) { setEditError("שגיאה בשמירה. נסה שוב."); return; }
    setVisits((prev) =>
      prev.map((v) =>
        v.id === editingVisit.id
          ? { ...v,
              visit_date: editForm.visit_date,
              deal_amount: editForm.deal_amount ? Number(editForm.deal_amount) : null,
              items_sold: editForm.items_sold.trim() || null,
              last_offer_description: editForm.last_offer_description.trim() || null,
              notes: editForm.notes.trim() || null,
            }
          : v
      )
    );
    setEditingVisit(null);
  }

  /* Delete visit */
  async function confirmDeleteVisit() {
    if (deleteVisitId === null) return;
    const vid = deleteVisitId;
    setDeleteVisitId(null);
    setExpandedIds((prev) => { const n = new Set(prev); n.delete(vid); return n; });
    setVisits((prev) => prev.filter((v) => v.id !== vid));
    await supabase.from("visits").delete().eq("id", vid);
  }

  /* Expand/collapse */
  function toggleExpand(visitId: number) {
    setExpandedIds((prev) => {
      const n = new Set(prev);
      if (n.has(visitId)) n.delete(visitId); else n.add(visitId);
      return n;
    });
  }

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <div className="h-5 w-24 rounded-full bg-white dark:bg-indigo-900/50 shadow animate-pulse" />
        <div className="h-40 rounded-3xl bg-white dark:bg-indigo-900/50 shadow-md shadow-black/5 animate-pulse" />
        <div className="h-12 w-full rounded-3xl bg-white dark:bg-indigo-900/50 shadow animate-pulse" />
        {[1, 2].map((i) => <div key={i} className="h-32 rounded-3xl bg-white dark:bg-indigo-900/50 shadow-md shadow-black/5 animate-pulse" />)}
      </div>
    );
  }

  const lastVisit = visits[0];

  return (
    <div className="flex flex-col gap-6">

      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.26, ease }}
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm font-semibold text-slate-400 dark:text-indigo-300/60 hover:text-pink-500 dark:hover:text-pink-400 transition-colors w-fit"
      >
        <ChevronRight size={15} strokeWidth={2.5} />
        מספרות
      </motion.button>

      {/* ── Salon hero card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease }}
        className="overflow-hidden rounded-3xl bg-white dark:bg-indigo-900/50 shadow-lg shadow-black/[0.07] dark:shadow-black/30"
      >
        <div className="h-24 bg-gradient-to-l from-pink-400 to-rose-400 dark:from-pink-600 dark:to-rose-600" />

        <div className="px-5 pb-5">
          <div className="-mt-8 mb-3 flex items-end justify-between">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white dark:bg-indigo-900 shadow-lg shadow-black/10 ring-4 ring-white dark:ring-indigo-900">
              <Scissors size={26} strokeWidth={1.6} className="text-pink-500" />
            </div>
            {lastVisit && (
              <span className={`mb-1 rounded-full px-3 py-1 text-xs font-bold ${urgencyChip(lastVisit.visit_date).classes}`}>
                {urgencyChip(lastVisit.visit_date).label}
              </span>
            )}
          </div>

          {/* Salon name + edit button */}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-indigo-950 dark:text-white flex-1">
              {salon?.name}
            </h1>
            <button
              onClick={() => setEditSalonOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-gray-200 dark:border-indigo-700 bg-white dark:bg-indigo-800/50 text-slate-400 dark:text-indigo-400 hover:border-pink-300 hover:text-pink-500 dark:hover:text-pink-400 transition-colors"
              aria-label="ערוך פרטי מספרה"
            >
              <Pencil size={15} strokeWidth={2} />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 dark:text-indigo-300/70">
            <p className="flex items-center gap-2">
              <User size={13} strokeWidth={1.8} className="shrink-0 text-pink-400" />
              {salon?.owner_name}
            </p>
            {salon?.phone_number && (
              <p className="flex items-center gap-2">
                <Phone size={13} strokeWidth={1.8} className="shrink-0 text-pink-400" />
                <span dir="ltr">{salon.phone_number}</span>
              </p>
            )}
            <p className="flex items-center gap-2">
              <MapPin size={13} strokeWidth={1.8} className="shrink-0 text-pink-400" />
              {salon?.street_address}
            </p>
            {lastVisit && (
              <p className="flex items-center gap-2">
                <CalendarDays size={13} strokeWidth={1.8} className="shrink-0 text-pink-400" />
                ביקור אחרון: {formatDate(lastVisit.visit_date)}
              </p>
            )}
            {lastVisit?.last_offer_description && (
              <p className="flex items-center gap-2">
                <Briefcase size={13} strokeWidth={1.8} className="shrink-0 text-pink-400" />
                {lastVisit.last_offer_description}
              </p>
            )}
          </div>

          {/* Quick-action buttons */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {salon?.phone_number ? (
              <a
                href={`https://wa.me/${salon.phone_number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30 transition-all hover:bg-emerald-600 hover:shadow-lg active:scale-[0.97]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.123 1.528 5.857L.057 23.882a.5.5 0 0 0 .611.611l6.025-1.471A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.001-1.368l-.358-.213-3.713.906.924-3.583-.234-.369A9.818 9.818 0 0 1 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                </svg>
                WhatsApp
              </a>
            ) : (
              <button disabled className="flex items-center justify-center gap-2 rounded-2xl bg-gray-100 dark:bg-indigo-800/40 py-3 text-sm font-bold text-gray-400 dark:text-indigo-500 cursor-not-allowed" title="אין מספר טלפון">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.123 1.528 5.857L.057 23.882a.5.5 0 0 0 .611.611l6.025-1.471A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.001-1.368l-.358-.213-3.713.906.924-3.583-.234-.369A9.818 9.818 0 0 1 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                </svg>
                WhatsApp
              </button>
            )}
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(salon?.street_address ?? "")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-sm font-bold text-white shadow-md shadow-sky-200 dark:shadow-sky-900/30 transition-all hover:bg-sky-600 hover:shadow-lg active:scale-[0.97]"
            >
              <Navigation size={16} strokeWidth={2.2} />
              ניווט
            </a>
          </div>
        </div>
      </motion.div>

      {/* ── Add visit CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.30, delay: 0.12, ease }}
      >
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setAddForm(emptyVisitForm()); setAddError(null); } }}>
          <DialogTrigger render={
            <button className="flex w-full items-center justify-center gap-2 rounded-3xl bg-pink-500 py-3.5 text-sm font-bold text-white shadow-md shadow-pink-200 dark:shadow-pink-900/30 transition-all hover:bg-pink-600 hover:shadow-lg active:scale-[0.98]" />
          }>
            <Plus size={16} strokeWidth={2.5} />
            תעד ביקור חדש
          </DialogTrigger>
          <DialogContent className="max-w-sm rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-indigo-950 dark:text-white">ביקור חדש</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddVisit} className="flex flex-col gap-4 pt-1">
              <VisitFormFields form={addForm} onChange={handleAddChange} onAppend={handleAddAppend} />
              {addError && <p className="text-sm text-red-500">{addError}</p>}
              <Button type="submit" disabled={addSaving}
                className="w-full rounded-2xl bg-pink-500 hover:bg-pink-600 font-bold shadow-md shadow-pink-200 dark:shadow-pink-900/30">
                {addSaving ? "שומר..." : "שמור ביקור"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Edit visit dialog (rich form with mic) */}
      <Dialog open={!!editingVisit} onOpenChange={(o) => { if (!o) setEditingVisit(null); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-indigo-950 dark:text-white">עריכת ביקור</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditVisit} className="flex flex-col gap-4 pt-1">
            <VisitFormFields form={editForm} onChange={handleEditChange} onAppend={handleEditAppend} />
            {editError && <p className="text-sm text-red-500">{editError}</p>}
            <Button type="submit" disabled={editSaving}
              className="w-full rounded-2xl bg-pink-500 hover:bg-pink-600 font-bold shadow-md shadow-pink-200 dark:shadow-pink-900/30">
              {editSaving ? "שומר..." : "שמור שינויים"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Visits header ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, delay: 0.16, ease }}
      >
        <h2 className="text-xl font-black tracking-tight text-indigo-950 dark:text-white">היסטוריית ביקורים</h2>
        <p className="mt-0.5 text-sm text-slate-400 dark:text-indigo-300/60">
          {visits.length === 0 ? "עוד לא תועד ביקור" : `${visits.length} ביקורים מתועדים`}
        </p>
      </motion.div>

      {/* ── Timeline ── */}
      {visits.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 rounded-3xl bg-white dark:bg-indigo-900/40 py-20 text-center shadow-md shadow-black/5"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-100 dark:bg-pink-900/30">
            <CalendarDays size={28} strokeWidth={1.5} className="text-pink-500" />
          </div>
          <div>
            <p className="font-black text-indigo-950 dark:text-white">אין ביקורים עדיין</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-indigo-300/60">תעד את הביקור הראשון למעלה</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={listVariants} initial="hidden" animate="show"
          className="relative flex flex-col gap-3"
        >
          {/* Timeline track */}
          <div className="absolute end-[1.45rem] top-4 bottom-4 w-px bg-pink-100 dark:bg-pink-900/40" />

          <AnimatePresence>
            {visits.map((visit, i) => {
              const chip     = urgencyChip(visit.visit_date);
              const expanded = expandedIds.has(visit.id);
              return (
                <motion.div
                  key={visit.id}
                  variants={itemVariants}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className="group relative flex gap-3"
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 ms-auto shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-[11px] font-black text-white shadow-md shadow-pink-200 dark:shadow-pink-900/40">
                    {visits.length - i}
                  </div>

                  {/* Visit card */}
                  <div className={[
                    "flex-1 w-0 overflow-hidden rounded-3xl bg-white dark:bg-indigo-900/50 transition-all",
                    i === 0
                      ? "shadow-lg shadow-black/[0.07] ring-2 ring-pink-200 dark:ring-pink-800/50"
                      : "shadow-md shadow-black/[0.05] dark:shadow-black/25",
                    expanded ? "ring-2 ring-pink-300 dark:ring-pink-700/50" : "",
                  ].join(" ")}>

                    {/* Card header — tap to expand */}
                    <div
                      className="flex cursor-pointer items-center justify-between gap-2 px-4 pt-4 pb-3"
                      onClick={() => toggleExpand(visit.id)}
                    >
                      <p className="font-bold text-sm text-indigo-950 dark:text-white">
                        {formatDate(visit.visit_date)}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${chip.classes}`}>
                          <Clock size={9} strokeWidth={2.5} />
                          {chip.label}
                        </span>
                        {/* Desktop-only hover buttons */}
                        <div
                          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openEditVisit(visit)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 dark:text-indigo-600 transition-colors hover:bg-pink-50 dark:hover:bg-pink-950/40 hover:text-pink-500 dark:hover:text-pink-400"
                            aria-label="ערוך ביקור"
                          >
                            <Pencil size={13} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => setDeleteVisitId(visit.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 dark:text-indigo-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
                            aria-label="מחק ביקור"
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </div>
                        {/* Expand chevron */}
                        <ChevronLeft
                          size={14}
                          strokeWidth={2}
                          className={`text-slate-300 dark:text-indigo-600 transition-transform ${expanded ? "-rotate-90" : ""}`}
                        />
                      </div>
                    </div>

                    {/* Card body — visit details */}
                    {(visit.deal_amount != null || visit.items_sold || visit.last_offer_description || visit.notes) && (
                      <div className="flex flex-col gap-2.5 border-t border-gray-100 dark:border-indigo-800/50 px-4 py-3">
                        {(visit.deal_amount != null || visit.items_sold) && (
                          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
                            <Banknote size={15} strokeWidth={1.8} className="shrink-0 text-emerald-500 dark:text-emerald-400" />
                            <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                              {visit.deal_amount != null && (
                                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                                  {formatCurrency(visit.deal_amount)}
                                </span>
                              )}
                              {visit.items_sold && (
                                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500 truncate">
                                  <ShoppingBag size={11} strokeWidth={1.8} className="shrink-0" />
                                  {visit.items_sold}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {visit.last_offer_description && (
                          <p className="flex items-start gap-2 text-sm text-slate-700 dark:text-indigo-200">
                            <Briefcase size={13} strokeWidth={1.8} className="mt-0.5 shrink-0 text-pink-400" />
                            {visit.last_offer_description}
                          </p>
                        )}
                        {visit.notes && (
                          <p className="flex items-start gap-2 text-sm text-slate-400 dark:text-indigo-400">
                            <StickyNote size={13} strokeWidth={1.8} className="mt-0.5 shrink-0 text-slate-300 dark:text-indigo-600" />
                            {visit.notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Expanded action row — visible on tap (mobile-friendly) */}
                    {expanded && (
                      <div className="border-t border-gray-50 dark:border-indigo-800/50 bg-gray-50/50 dark:bg-indigo-950/20 px-4 py-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => { openEditVisit(visit); }}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-indigo-700 bg-white dark:bg-indigo-800/50 py-2.5 text-xs font-bold text-slate-600 dark:text-indigo-300"
                          >
                            <Pencil size={12} strokeWidth={2} />
                            ערוך
                          </button>
                          <button
                            onClick={() => setDeleteVisitId(visit.id)}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 py-2.5 text-xs font-bold text-red-600 dark:text-red-400"
                          >
                            <Trash2 size={12} strokeWidth={2} />
                            מחק
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Edit salon bottom-sheet */}
      {editSalonOpen && salon && (
        <EditSalonSheet
          salon={salon}
          onClose={() => setEditSalonOpen(false)}
          onSaved={(updated) => { setSalon(updated); setEditSalonOpen(false); }}
        />
      )}

      {/* Delete visit confirm dialog */}
      {deleteVisitId !== null && (
        <ConfirmDialog
          message="האם למחוק את הביקור? פעולה זו אינה ניתנת לביטול."
          onConfirm={confirmDeleteVisit}
          onCancel={() => setDeleteVisitId(null)}
        />
      )}
    </div>
  );
}
