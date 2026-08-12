import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "admin_email")
    .maybeSingle();
  const adminEmail = (setting?.value as { email?: string })?.email;
  if (adminEmail && user.email === adminEmail) return user;
  return null;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const { ip, fingerprint, reason } = body as {
    ip?: string | null;
    fingerprint?: string | null;
    reason?: string | null;
  };

  if (!ip && !fingerprint) {
    return NextResponse.json({ error: "ip أو fingerprint مطلوب" }, { status: 422 });
  }

  const supabase = createServiceClient();

  // Insert into blocked_clients (upsert by fingerprint or ip).
  const { error } = await supabase.from("blocked_clients").upsert(
    {
      ip: ip ?? null,
      fingerprint: fingerprint ?? null,
      reason: reason ?? null,
    },
    { onConflict: "fingerprint,ip" },
  );
  if (error) {
    // Try insert with just fingerprint if ip conflict
    const { error: err2 } = await supabase.from("blocked_clients").insert({
      ip: ip ?? null,
      fingerprint: fingerprint ?? null,
      reason: reason ?? null,
    });
    if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
  }

  // Also mark client as blocked if found.
  if (fingerprint) {
    await supabase.from("clients").update({ is_blocked: true }).eq("fingerprint", fingerprint);
  } else if (ip) {
    await supabase.from("clients").update({ is_blocked: true }).eq("ip", ip);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const { id } = body as { id: string };
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 422 });

  const supabase = createServiceClient();
  const { data: record } = await supabase
    .from("blocked_clients")
    .select("fingerprint, ip")
    .eq("id", id)
    .maybeSingle();

  if (record?.fingerprint) {
    await supabase.from("clients").update({ is_blocked: false }).eq("fingerprint", record.fingerprint);
  }

  const { error } = await supabase.from("blocked_clients").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
