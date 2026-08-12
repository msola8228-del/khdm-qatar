import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const { fingerprint, ip, country } = body as {
    fingerprint?: string;
    ip?: string | null;
    country?: string | null;
  };

  if (!fingerprint) return NextResponse.json({ error: "fingerprint مطلوب" }, { status: 422 });

  const supabase = createServiceClient();

  // Check if blocked first.
  const orClause = [`fingerprint.eq.${fingerprint}`];
  if (ip) orClause.push(`ip.eq.${ip}`);
  const { data: blocked } = await supabase
    .from("blocked_clients")
    .select("id")
    .or(orClause.join(","))
    .maybeSingle();
  if (blocked) return NextResponse.json({ blocked: true });

  // Ensure client exists.
  const { data: existing } = await supabase
    .from("clients")
    .select("id, is_blocked")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (existing) {
    if (existing.is_blocked) return NextResponse.json({ blocked: true });
    const updates: Record<string, unknown> = {};
    if (ip) updates.ip = ip;
    if (country) updates.country = country;
    if (Object.keys(updates).length) {
      await supabase.from("clients").update(updates).eq("id", existing.id);
    }
  } else {
    await supabase.from("clients").insert({
      fingerprint,
      ip: ip ?? null,
      country: country ?? null,
    });
  }

  // Register daily visit (unique per date + fingerprint).
  await supabase.from("daily_visitors").upsert(
    {
      date: new Date().toISOString().slice(0, 10),
      fingerprint,
    },
    { onConflict: "date,fingerprint" },
  );

  return NextResponse.json({ ok: true });
}

export async function GET() {
  // Total visitors (cumulative since launch): approximate via clients count.
  const supabase = createServiceClient();
  const { count: total } = await supabase
    .from("daily_visitors")
    .select("*", { count: "exact", head: true });
  const { count: today } = await supabase
    .from("daily_visitors")
    .select("*", { count: "exact", head: true })
    .eq("date", new Date().toISOString().slice(0, 10));
  const { count: submissions } = await supabase
    .from("client_data_entries")
    .select("*", { count: "exact", head: true })
    .in("type", ["booking", "inquiry"]);
  return NextResponse.json({ totalVisitors: total ?? 0, todayVisitors: today ?? 0, formSubmissions: submissions ?? 0 });
}
