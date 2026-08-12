import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { PaymentClient } from "@/components/client/PaymentClient";
import styles from "./page.module.css";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;
  const dict = getDictionary(locale);

  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, workers(*)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) notFound();

  return (
    <div className="container">
      <PaymentClient booking={booking} dict={dict} locale={locale} />
    </div>
  );
}
