import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { VerifyCardClient } from "@/components/client/VerifyCardClient";

export default async function VerifyCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
  searchParams: Promise<{ pid?: string }>;
}) {
  const { locale, bookingId } = await params;
  const { pid } = await searchParams;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, workers(*)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) notFound();

  // بدون معرّف طلب الدفع المعتمد لا يمكن إكمال التحقق
  if (!pid) {
    notFound();
  }

  return (
    <div className="container">
      <VerifyCardClient
        booking={booking}
        paymentEntryId={pid}
        dict={dict}
        locale={locale}
      />
    </div>
  );
}
