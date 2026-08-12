import { createClient } from "@/lib/supabase/server";
import { BookingsAdminClient } from "@/components/admin/BookingsAdminClient";

export default async function AdminBookingsPage() {
  const supabase = createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, workers(*), clients(name, email, phone, fingerprint, ip)")
    .order("created_at", { ascending: false });

  return <BookingsAdminClient bookings={bookings ?? []} />;
}
