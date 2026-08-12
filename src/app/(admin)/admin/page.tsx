import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/admin/DashboardClient";
import { ClientInboxClient, type InboxClient } from "@/components/admin/ClientInboxClient";

export default async function AdminDashboard() {
  const supabase = createClient();
  const [{ count: workersCount }, { count: bookingsCount }, { count: pendingBookings }, { count: todayVisitors }] =
    await Promise.all([
      supabase.from("workers").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("daily_visitors")
        .select("*", { count: "exact", head: true })
        .eq("date", new Date().toISOString().slice(0, 10)),
    ]);

  // Recent 5 bookings with worker.
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("id, booking_ref, status, created_at, workers(full_name, photo_url)")
    .order("created_at", { ascending: false })
    .limit(5);

  // جلب العملاء + آخر إدخال لكل عميل (للشريط الجانبي)
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, phone, country, fingerprint, is_blocked, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: entries } = await supabase
    .from("client_data_entries")
    .select("client_id, type, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  // دمج آخر إدخال لكل عميل
  const latestEntry = new Map<string, { type: string; created_at: string }>();
  for (const e of entries ?? []) {
    if (e.client_id && !latestEntry.has(e.client_id)) {
      latestEntry.set(e.client_id, { type: e.type, created_at: e.created_at });
    }
  }

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
      is_blocked: c.is_blocked,
      created_at: c.created_at,
      timeAgo: timeAgo(lastDate),
      lastActivity: lastType ? activityLabel(lastType) : "زيارة جديدة",
      lastType,
      active: !!entry,
      initials: initials || "؟",
    };
  });

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, minHeight: "calc(100vh - 46px)" }}>
      <ClientInboxClient clients={inboxClients} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <DashboardClient
          stats={{
            workersCount: workersCount ?? 0,
            bookingsCount: bookingsCount ?? 0,
            pendingBookings: pendingBookings ?? 0,
            todayVisitors: todayVisitors ?? 0,
          }}
          recentBookings={recentBookings ?? []}
        />
      </div>
    </div>
  );
}
