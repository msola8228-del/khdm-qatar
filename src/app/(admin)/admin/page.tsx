import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/admin/DashboardClient";

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

  return (
    <DashboardClient
      stats={{
        workersCount: workersCount ?? 0,
        bookingsCount: bookingsCount ?? 0,
        pendingBookings: pendingBookings ?? 0,
        todayVisitors: todayVisitors ?? 0,
      }}
      recentBookings={recentBookings ?? []}
    />
  );
}
