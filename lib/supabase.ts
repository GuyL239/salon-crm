import { createBrowserClient } from "@supabase/ssr";

// createBrowserClient stores the session in cookies (not localStorage),
// so the middleware Edge runtime can read it and protect routes.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
};
