import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import styles from "./layout.module.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/ar/login");

  // Check admin role.
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "admin_email")
    .maybeSingle();
  const adminEmail = (setting?.value as { email?: string })?.email;
  if (!adminEmail || user.email !== adminEmail) {
    redirect("/ar/blocked");
  }

  return (
    <div className={styles.layout} dir="rtl">
      <AdminSidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
