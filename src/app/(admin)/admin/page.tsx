import { createClient } from "@/lib/supabase/server";
import { AdminInboxView } from "@/components/admin/AdminInboxView";
import type { InboxClient } from "@/components/admin/ClientInboxClient";

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

  // جلب العملاء
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, phone, country, fingerprint, ip, is_blocked, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const clientIds = (clients ?? []).map((c) => c.id).filter(Boolean);

  // جلب الحجوزات + المرشح
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_ref, client_id, worker_id, status, notes, terms_snapshot, return_policy_snapshot, created_at, workers(full_name, nationality, photo_url, expected_salary)")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  // جلب الإدخالات
  const { data: entries } = await supabase
    .from("client_data_entries")
    .select("id, client_id, type, payload, created_at")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false })
    .limit(200);

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
  for (const e of entries ?? []) {
    if (!e.client_id) continue;
    const list = entriesByClient.get(e.client_id) ?? [];
    list.push(e);
    entriesByClient.set(e.client_id, list);
    if (!latestEntry.has(e.client_id)) {
      latestEntry.set(e.client_id, { type: e.type, created_at: e.created_at });
    }
  }

  const inboxClients: InboxClient[] = (clients ?? []).map((c) => {
    const entry = c.id ? latestEntry.get(c.id) : undefined;
    const name = c.name || (c.email ? c.email.split("@")[0] : "زائر");
    const initials = name.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
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
      ip: c.ip,
      is_blocked: c.is_blocked,
      created_at: c.created_at,
      timeAgo: timeAgo(lastDate),
      lastActivity: lastType ? activityLabel(lastType) : "زيارة جديدة",
      lastType,
      active: !!entry,
      initials: initials || "؟",
      bookings: c.id ? (bookingsByClient.get(c.id) ?? []) : [],
      entries: c.id ? (entriesByClient.get(c.id) ?? []) : [],
    };
  });

  return <AdminInboxView clients={inboxClients} />;
}

