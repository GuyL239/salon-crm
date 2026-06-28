import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// POST /api/push/subscribe
// Body: { subscription: PushSubscription (JSON) }
// Saves (or upserts) the browser's PushSubscription for the current user.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const subscription: PushSubscriptionJSON = body.subscription;

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Upsert so re-subscribing (e.g. after browser reinstall) just refreshes the keys
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id:      user.id,
      endpoint:     subscription.endpoint,
      p256dh:       (subscription.keys as Record<string, string>)?.p256dh ?? null,
      auth:         (subscription.keys as Record<string, string>)?.auth ?? null,
      updated_at:   new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
