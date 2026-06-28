import { createBrowserClient } from "@supabase/ssr";

export function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for all existing imports — getSupabase() memoizes internally.
export const supabase = getSupabase();

export type City = {
  id: number;
  name: string;
};

export type Salon = {
  id: number;
  city_id: number;
  name: string;
  owner_name: string;
  street_address: string;
  phone_number: string | null;
};

export type Visit = {
  id: number;
  salon_id: number;
  visit_date: string;
  last_offer_description: string | null;
  notes: string | null;
  deal_amount: number | null;
  items_sold: string | null;
  is_completed: boolean;
  visit_time: string | null; // "HH:MM:SS" from PostgreSQL time type
  reminders: Array<{ date: string; time: string; job_id?: string }> | null;
};
