import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

// POST /api/qstash/cancel
// Body: { jobIds: string[] }
// Cancels pending QStash messages. Safe to call even if messages already fired
// (QStash returns 404 for unknown IDs which we silently ignore).
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobIds }: { jobIds: string[] } = await req.json();
  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    return NextResponse.json({ ok: true, cancelled: 0 });
  }

  // Cancel all in parallel; swallow 404s (message already fired or never existed)
  const results = await Promise.allSettled(
    jobIds.map((id) => qstash.messages.delete(id))
  );

  const cancelled = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, cancelled });
}
