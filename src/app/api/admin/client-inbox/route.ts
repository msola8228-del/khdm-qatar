import { NextResponse } from "next/server";
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

// تحويل رمز الدولة (QA, JO, SA...) إلى علم إيموجي
function countryToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const cc = code.toUpperCase();
  const codePoints = Array.from(cc).map(
    (c) => 0x1f1e6 + (c.charCodeAt(0) - 65),
  );
  return String.fromCodePoint(...codePoints);
}

// تلخيص النشاط حسب نوع الإدخال
function activityLabel(type: string): string {
  switch (type) {
    case "booking":
      return "حجز مرشح";
    case "inquiry":
      return "استفسار";
    case "payment":
      return "دفع";
    case "verification":
      return "تحقق";
    default:
      return "زيارة";
  }
}

// رسالة الوقت المنقضي بالعربية
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} س`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "منذ يوم";
  if (day === 2) return "منذ يومين";
  if (day < 11) return `منذ ${day} أيام`;
  return `منذ ${Math.floor(day / 7)} أسابيع`;
}

type EnrichedClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  flag: string;
  fingerprint: string;
  is_blocked: boolean;
  created_at: string;
  timeAgo: string;
  lastActivity: string;
  lastType: string | null;
  active: boolean;
  initials: string;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const supabase = createServiceClient();

  // جلب كل العملاء
  const { data: clients, error: cErr } = await supabase
    .from("clients")
    .select("id, name, email, phone, country, fingerprint, is_blocked, created_at")
    .order("created_at", { ascending: false });

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  // جلب آخر إدخال لكل عميل (نأخذ آخر 100 إدخال ثم نُجمّع العميل الأحدث لكل client_id)
  const { data: entries } = await supabase
    .from("client_data_entries")
    .select("client_id, type, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  // خريطة: client_id → آخر إدخال
  const latestEntry = new Map<
    string,
    { type: string; created_at: string; payload: Record<string, unknown> }
  >();
  for (const e of entries ?? []) {
    if (e.client_id && !latestEntry.has(e.client_id)) {
      latestEntry.set(e.client_id, {
        type: e.type,
        created_at: e.created_at,
        payload: e.payload as Record<string, unknown>,
      });
    }
  }

  // دمج البيانات
  const enriched: EnrichedClient[] = (clients ?? []).map((c) => {
    const entry = c.id ? latestEntry.get(c.id) : undefined;
    const lastPayload = entry?.payload ?? {};
    // الاسم: من العميل أولاً، ثم من آخر إدخال، ثم "زائر"
    const name =
      c.name ||
      (lastPayload.full_name as string | undefined) ||
      (c.email ? c.email.split("@")[0] : "زائر");

    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase();

    const lastType = entry?.type ?? null;
    const lastDate = entry?.created_at ?? c.created_at;

    return {
      id: c.id,
      name,
      email: c.email,
      phone: c.phone,
      country: c.country,
      flag: countryToFlag(c.country),
      fingerprint: c.fingerprint,
      is_blocked: c.is_blocked,
      created_at: c.created_at,
      timeAgo: timeAgo(lastDate),
      lastActivity: lastType ? activityLabel(lastType) : "زيارة جديدة",
      lastType,
      active: !!entry,
      initials: initials || "؟",
    };
  });

  return NextResponse.json({ clients: enriched, total: enriched.length });
}
