import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

// POST: حذف عميل (أو عدة عملاء) — حذف ناعم عبر إزالة الصفوف المرتبطة أولاً
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const { clientIds } = body as { clientIds?: string[] };
  if (!clientIds || clientIds.length === 0) {
    return NextResponse.json({ error: "clientIds مطلوب" }, { status: 422 });
  }

  const supabase = createServiceClient();

  // احذف الصفوف التابعة أولاً لتجنب قيود المفاتيح الأجنبية
  // daily_visitors(client_id) — on delete set null/cascade يعتمد على الـ schema
  await supabase.from("daily_visitors").delete().in("client_id", clientIds);
  await supabase.from("client_data_entries").delete().in("client_id", clientIds);
  // bookings(client_id) قد يكون set null — احذف الحجوزات المرتبطة (أو اتركها)
  // نترك الحجوزات لكن نُفرغ client_id لتجنّب فقدان السجل التجاري.
  await supabase.from("bookings").update({ client_id: null }).in("client_id", clientIds);

  // احذف العملاء
  const { error } = await supabase.from("clients").delete().in("id", clientIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: clientIds.length });
}
