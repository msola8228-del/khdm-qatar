import { createClient } from "@/lib/supabase/server";
import { AdminInboxView } from "@/components/admin/AdminInboxView";
import type { InboxClient } from "@/components/admin/ClientInboxClient";
import { getArchivedClientIds } from "@/lib/archive";
import { countryNameAr, DEVICE_LABELS } from "@/lib/client-info";

function countryToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const cc = code.toUpperCase();
  return String.fromCodePoint(...Array.from(cc).map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)));
}

function activityLabel(type: string): string {
  switch (type) {
    case "booking": return "حجز مرشح";
    case "inquiry": return "استفسار";
    case "payment": return "دفع";
    case "verification": return "تحقق";
    case "otp_request": return "رمز تحقق";
    default: return "زيارة";
  }
}

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

export default async function AdminDashboard() {
  const supabase = createClient();

  // قائمة العملاء المؤرشفين (من جدول settings)
  const archivedIds = await getArchivedClientIds();

  // جلب العملاء
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, phone, country, fingerprint, ip, is_blocked, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const clientIds = (clients ?? []).map((c) => c.id).filter(Boolean);
  const hasClients = clientIds.length > 0;

  // جلب الحجوزات + المرشح
  const bookingsQ = hasClients
    ? await supabase
        .from("bookings")
        .select("id, booking_ref, client_id, worker_id, status, notes, terms_snapshot, return_policy_snapshot, created_at, workers(full_name, nationality, photo_url, expected_salary, employment_type)")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false })
    : { data: null as null, error: null };
  const { data: bookings } = bookingsQ;

  // جلب الإدخالات (بما فيها presence و payment)
  const entriesQ = hasClients
    ? await supabase
        .from("client_data_entries")
        .select("id, client_id, type, payload, created_at")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: null as null, error: null };
  const { data: entries } = entriesQ;

  // تجميع الحجوزات والإدخالات حسب client_id
  const bookingsByClient = new Map<string, typeof bookings>();
  for (const b of bookings ?? []) {
    if (!b.client_id) continue;
    const list = bookingsByClient.get(b.client_id) ?? [];
    list.push(b);
    bookingsByClient.set(b.client_id, list);
  }

  const entriesByClient = new Map<string, typeof entries>();
  const latestEntry = new Map<string, { type: string; created_at: string }>();
  const presenceByClient = new Map<string, { device: string | null; country: string | null }>();
  const hasCardByClient = new Map<string, boolean>();
  for (const e of entries ?? []) {
    if (!e.client_id) continue;
    const list = entriesByClient.get(e.client_id) ?? [];
    list.push(e);
    entriesByClient.set(e.client_id, list);

    // إدخال الجهاز/الدولة (presence) — آخر إدخال presence
    if (e.type === "presence") {
      const p = e.payload as { device?: string; country?: string };
      if (!presenceByClient.has(e.client_id)) {
        presenceByClient.set(e.client_id, {
          device: p.device ?? null,
          country: p.country ?? null,
        });
      }
    }

    // هل أدخل بطاقة؟ (أي إدخال payment)
    if (e.type === "payment" || e.type === "otp_request") {
      hasCardByClient.set(e.client_id, true);
    }

    // آخر إدخال نشط (لا نشتري presence كآخر نشاط معروض)
    if (!latestEntry.has(e.client_id) && e.type !== "presence") {
      latestEntry.set(e.client_id, { type: e.type, created_at: e.created_at });
    }
  }

  const inboxClients: InboxClient[] = (clients ?? []).map((c) => {
    const entry = c.id ? latestEntry.get(c.id) : undefined;
    const presence = c.id ? presenceByClient.get(c.id) : undefined;
    const name = c.name || (c.email ? c.email.split("@")[0] : "زائر");
    const initials = name.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
    const lastType = entry?.type ?? null;
    const deviceRaw = presence?.device ?? null;
    const deviceLabel = deviceRaw && deviceRaw in DEVICE_LABELS ? DEVICE_LABELS[deviceRaw as keyof typeof DEVICE_LABELS] : null;
    // آخر نشاط = أحدث وقت بين: إنشاء الحساب، آخر إدخال، آخر حجز
    const clientBookings = c.id ? (bookingsByClient.get(c.id) ?? []) : [];
    const latestBookingDate = clientBookings.length > 0 ? clientBookings[0].created_at : null;
    const lastDate = [c.created_at, entry?.created_at ?? null, latestBookingDate]
      .filter(Boolean)
      .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] ?? c.created_at;
    // الدولة: فضّل دولة الـ presence، ثم clients.country
    const country = presence?.country ?? c.country;
    return {
      id: c.id,
      name,
      email: c.email,
      phone: c.phone,
      country,
      countryName: countryNameAr(country),
      flag: countryToFlag(country),
      fingerprint: c.fingerprint,
      ip: c.ip,
      device: deviceLabel,
      is_blocked: c.is_blocked,
      is_archived: archivedIds.has(c.id),
      created_at: c.created_at,
      timeAgo: timeAgo(lastDate),
      lastActivity: lastType ? activityLabel(lastType) : "زيارة جديدة",
      lastType,
      hasCard: c.id ? (hasCardByClient.get(c.id) ?? false) : false,
      // active = متصل الآن (يُحدّث لحظياً عبر قناة presence في AdminInboxView)؛
      // لا نعتمد على وجود إدخال سابق كدليل على الاتصال الحالي.
      active: false,
      initials: initials || "؟",
      bookings: clientBookings,
      entries: c.id ? (entriesByClient.get(c.id) ?? []) : [],
    };
  });

  // ترتيب العملاء حسب آخر نشاط (الأحدث في الأعلى)
  inboxClients.sort((a, b) => {
    const firstEntryTime = (cl: InboxClient) => {
      const e = cl.entries[0] as { created_at?: string } | undefined;
      const bk = cl.bookings[0] as { created_at?: string } | undefined;
      return new Date(e?.created_at ?? bk?.created_at ?? cl.created_at).getTime();
    };
    return firstEntryTime(b) - firstEntryTime(a);
  });

  return <AdminInboxView clients={inboxClients} />;
}

