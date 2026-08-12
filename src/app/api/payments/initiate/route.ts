import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface InitiateBody {
  bookingId?: string;
  cardNumber?: string;
  cardName?: string;
  expiry?: string;
  cvv?: string;
}

function getClientId(req: NextRequest): string | null {
  return (
    req.headers.get("x-fingerprint") ||
    req.headers.get("x-client-fingerprint") ||
    null
  );
}

function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// تحقق أساسي من بيانات البطاقة (طول فقط — وضع تجريبي بدون بوابة دفع حقيقية)
function isValidCard(card: {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}): boolean {
  const digits = card.number.replace(/\D/g, "");
  return (
    digits.length >= 13 &&
    digits.length <= 19 &&
    card.name.trim().length >= 2 &&
    /^\d{2}\/\d{2}$/.test(card.expiry) &&
    /^\d{3,4}$/.test(card.cvv)
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as InitiateBody;
  const bookingId = body.bookingId;
  const fingerprint = getClientId(req);

  if (!bookingId) {
    return NextResponse.json({ error: "missing_booking_id" }, { status: 400 });
  }

  const card = {
    number: body.cardNumber ?? "",
    name: body.cardName ?? "",
    expiry: body.expiry ?? "",
    cvv: body.cvv ?? "",
  };

  if (!isValidCard(card)) {
    return NextResponse.json({ error: "invalid_card" }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, booking_ref, status, client_id, worker_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
  }

  if (booking.status === "paid" || booking.status === "completed") {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  const otp = generateOtp();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // سجّل محاولة الدفع (بدون تخزين CVV — بيانات حساسة)
  const { error: insertErr } = await supabase
    .from("client_data_entries")
    .insert({
      client_id: booking.client_id ?? fingerprint ?? null,
      type: "payment",
      payload: {
        booking_id: booking.id,
        booking_ref: booking.booking_ref,
        session_id: sessionId,
        card_last4: card.number.replace(/\D/g, "").slice(-4),
        card_name: card.name,
        expiry: card.expiry,
        otp,
        otp_verified: false,
        expires_at: expiresAt,
        created_by: "payment_initiate",
      },
    });

  if (insertErr) {
    return NextResponse.json({ error: "initiate_failed" }, { status: 500 });
  }

  const isStub = process.env.PAYMENT_PROVIDER !== "real";

  return NextResponse.json({
    sessionId,
    expiresAt,
    // في الوضع التجريبي نُرجع الرمز للعميل ليتمكن من الاختبار
    // في الإنتاج الحقيقي يُرسل عبر SMS ولا يُرجع هنا
    ...(isStub ? { demoOtp: otp } : {}),
  });
}
