import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { VerifyCardClient } from "@/components/client/VerifyCardClient";

export default async function VerifyCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
  searchParams: Promise<{ session?: string; otp?: string }>;
}) {
  const { locale, bookingId } = await params;
  const { session, otp } = await searchParams;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, workers(*)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) notFound();

  // بدون جلسة دفع صالحة لا يمكن إكمال التحقق
  if (!session) {
    notFound();
  }

  return (
    <div className="container">
      <VerifyCardClient
        booking={booking}
        sessionId={session}
        demoOtp={otp}
        dict={dict}
        locale={locale}
      />
    </div>
  );
}
