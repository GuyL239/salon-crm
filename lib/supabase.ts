import { createBrowserClient } from "@supabase/ssr";

// Unique token stamped at module evaluation time — appears in the debug banner
// so we can confirm Vercel finished deploying this exact build.
export const BUILD_ID = `build-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Prevent Vercel / Next.js fetch cache from storing Supabase REST responses.
      // Without this, Next.js wraps fetch() and may serve cached API responses
      // across different users' requests at the CDN / Data Cache layer.
      global: {
        fetch: (url, options = {}) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    }
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
  reminders: Array<{ date: string; time: string }> | null;
};
