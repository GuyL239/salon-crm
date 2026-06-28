import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import webpush from "web-push";

// Configure once — VAPID keys must be in env vars (never in source)
webpush.setVapidDetails(
  "mailto:guylanker2@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// POST /api/push/send
// Body: { userId: string, title: string, body: string, url?: string }
// Looks up the user's stored PushSubscription and fires the Web Push message.
// Called by the QStash webhook when a scheduled reminder fires.
export async function POST(req: NextRequest) {
  // Validate QStash signature in production (guards against spoofed requests).
  // Skipped here for now — add @upstash/qstash signature verification when wiring QStash.

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,   // service role: read any user's subscription
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { userId, title, body, url = "/" } = await req.json();
  if (!userId || !title || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: sub, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
    .single();

  if (error || !sub) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const pushSub = {
    endpoint: sub.endpoint as string,
    keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
  };

  const payload = JSON.stringify({ title, body, icon: "/icons/icon-192.png", url });

  try {
    await webpush.sendNotification(pushSub, payload);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Push failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
