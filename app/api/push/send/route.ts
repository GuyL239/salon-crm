import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import webpush from "web-push";
import { Receiver } from "@upstash/qstash";

webpush.setVapidDetails(
  "mailto:guylanker2@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY!,
});

// POST /api/push/send
// Called exclusively by QStash at the scheduled reminder time.
// Body (from QStash): { userId, visitId, title, body, url? }
export async function POST(req: NextRequest) {
  // Verify the request genuinely came from QStash (prevents spoofing)
  const rawBody = await req.text();
  const signature = req.headers.get("upstash-signature") ?? "";

  try {
    await receiver.verify({ signature, body: rawBody });
  } catch {
    return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 });
  }

  const { userId, title, body, url = "/" } = JSON.parse(rawBody);
  if (!userId || !title || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Use service-role client so we can read any user's subscription regardless of RLS
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

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

  try {
    await webpush.sendNotification(
      pushSub,
      JSON.stringify({ title, body, icon: "/icons/icon-192.png", url })
    );
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Push failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
