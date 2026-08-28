"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFingerprint } from "@/lib/presence";
import styles from "./Maawen.module.css";

interface ClientInfo {
  full_name: string;
  national_id: string;
  phone: string;
  address: string;
}

export function ClientInfoForm({ locale }: { locale: string }) {
  const router = useRouter();
  const prefix = `/${locale}`;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate(data: ClientInfo): Record<string, string> {
    const errs: Record<string, string> = {};
    if (data.full_name.trim().length < 2) errs.full_name = "الاسم الكامل مطلوب";
    if (data.national_id.trim().length < 4) errs.national_id = "رقم الهوية مطلوب";
    if (!/^[0-9]{8}$/.test(data.phone.trim())) errs.phone = "رقم الجوال يجب أن يكون 8 أرقام";
    if (data.address.trim().length < 3) errs.address = "العنوان مطلوب";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data: ClientInfo = {
      full_name: String(form.full_name.value ?? ""),
      national_id: String(form.fullid.value ?? ""),
      phone: String(form.phone.value ?? ""),
      address: String(form.address.value ?? ""),
    };

    const errs = validate(data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    // اجلب بيانات الحجز المحفوظة في sessionStorage
    const bookingRaw = typeof window !== "undefined" ? sessionStorage.getItem("maawen_booking") : null;
    let booking = {};
    try {
      booking = bookingRaw ? JSON.parse(bookingRaw) : {};
    } catch {
      booking = {};
    }

    const fingerprint = typeof window !== "undefined" ? getFingerprint() : "ssr";
    const bookingRef = (booking as Record<string, unknown>).bookingRef as string | undefined;

    try {
      const res = await fetch("/api/maawen/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-fingerprint": fingerprint },
        body: JSON.stringify({
          fullName: data.full_name,
          national_id: data.national_id,
          phone: data.phone,
          address: data.address,
          bookingRef,
          booking: booking as Record<string, unknown>,
        }),
      });
      const result = await res.json();
      setLoading(false);
      if (!res.ok) {
        setErrors({ phone: result.error || "حدث خطأ في حفظ البيانات" });
        return;
      }

      // احفظ بيانات العميل ثم انتقل لصفحة الملخص والدفع
      sessionStorage.setItem("maawen_client", JSON.stringify(data));
      const bookingId = (booking as Record<string, unknown>).bookingId as string | undefined;
      const query = new URLSearchParams({
        service: String((booking as Record<string, unknown>).service ?? ""),
        total: String((booking as Record<string, unknown>).total ?? 0),
        ref: bookingRef ?? result.bookingRef ?? "",
      });
      if (bookingId) query.set("bookingId", bookingId);
      router.push(`${prefix}/amount?${query.toString()}`);
    } catch {
      setLoading(false);
      setErrors({ phone: "حدث خطأ في إرسال البيانات" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.clientFormSpace}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="fullName">اسم العميل</label>
        <input type="text" id="fullName" name="full_name" className={styles.input} placeholder="الاسم الكامل" />
        {errors.full_name && <span style={{ color: "var(--color-danger)", fontSize: 12 }}>{errors.full_name}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="fullid">رقم الهوية</label>
        <input type="text" id="fullid" name="fullid" className={styles.input} dir="ltr" placeholder="رقم الهوية" />
        {errors.national_id && <span style={{ color: "var(--color-danger)", fontSize: 12 }}>{errors.national_id}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="phone">رقم الجوال</label>
        <div className={styles.phoneWrap}>
          <span className={styles.phonePrefix}>+974</span>
          <input type="tel" id="phone" name="phone" className={styles.phoneInput} dir="ltr" placeholder="XXXXXXXX" pattern="[0-9]{8}" />
        </div>
        {errors.phone && <span style={{ color: "var(--color-danger)", fontSize: 12 }}>{errors.phone}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="address">العنوان</label>
        <input type="text" id="address" name="address" className={styles.input} placeholder="المنطقة، الشارع، رقم المبنى" />
        {errors.address && <span style={{ color: "var(--color-danger)", fontSize: 12 }}>{errors.address}</span>}
      </div>

      <button type="submit" className={styles.btnPrimary} disabled={loading}>
        {loading ? "جارٍ الحفظ..." : "متابعة"}
      </button>

      <div style={{ textAlign: "center", paddingTop: 16 }}>
        <a href="/" className={styles.backLink}>العودة للرئيسية</a>
      </div>
    </form>
  );
}