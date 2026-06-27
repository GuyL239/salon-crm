import { createBrowserClient } from "@supabase/ssr";

// Factory function (Supabase official App Router pattern).
// createBrowserClient memoizes internally by URL+key, so this always
// returns the same singleton — but calling it as a function ensures
// the instance is created in the browser context (isBrowser()=true),
// not captured during SSR module evaluation.
export function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Re-export a singleton for backward-compatibility with all existing imports.
// Because createBrowserClient memoizes, this is the same instance as getSupabase().
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
  reminders: Array<{ date: string; time: string }> | null;
};
