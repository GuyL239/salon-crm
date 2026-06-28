import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

// POST /api/qstash/schedule
// Body: { visitId, salonName, reminderAt (UTC ms), title?, body? }
// Schedules a delayed Web Push message via QStash that fires at reminderAt.
// Returns { jobId } — caller should persist this alongside the reminder so it
// can be cancelled if the visit is updated or deleted.
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

  const { visitId, salonName, reminderAt, title, body } = await req.json();

  if (!visitId || !salonName || !reminderAt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const fireAt = new Date(reminderAt);
  // Refuse to schedule in the past (QStash would fire immediately instead of
  // at the right time, sending a spurious notification)
  if (fireAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Reminder time is in the past" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const { messageId } = await qstash.publishJSON({
    url: `${appUrl}/api/push/send`,
    body: {
      userId:   user.id,
      visitId,
      title:    title  ?? `תזכורת ביקור — ${salonName}`,
      body:     body   ?? `זכור: ביקור אצל ${salonName}`,
      url:      "/",
    },
    // notBefore = Unix timestamp in seconds
    notBefore: Math.floor(fireAt.getTime() / 1000),
  });

  return NextResponse.json({ jobId: messageId });
}
