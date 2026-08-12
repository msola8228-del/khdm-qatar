import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import styles from "./page.module.css";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, workers(*)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) notFound();

  return (
    <div className="container">
      <h1 className={styles.title}>{dict.payment.underConstruction ? dict.payment.underConstruction : "صفحة الدفع"}</h1>
      <Card className={styles.stub}>
        <div className={styles.notice}>🚧 {dict.payment.underConstruction}</div>
        <div className={styles.row}>
          <span>{dict.payment.bookingRef}</span>
          <strong>{booking.booking_ref}</strong>
        </div>
        <div className={styles.row}>
          <span>المرشح</span>
          <strong>{booking.workers?.full_name}</strong>
        </div>
      </Card>
    </div>
  );
}
