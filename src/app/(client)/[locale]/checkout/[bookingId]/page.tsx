import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { CheckoutClient } from "@/components/client/CheckoutClient";
import styles from "./page.module.css";

export default async function CheckoutPage({
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
      <h1 className={styles.title}>{dict.checkout.summary}</h1>
      <CheckoutClient booking={booking} dict={dict} locale={locale} />
    </div>
  );
}
