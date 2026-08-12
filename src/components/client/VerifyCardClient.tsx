"use client";

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dictionary } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatSalary } from "@/lib/utils";
import type { Booking, Worker } from "@/lib/supabase/types";
import styles from "./VerifyCardClient.module.css";

const OTP_LENGTH = 4;
const RESEND_SECONDS = 60;

export function VerifyCardClient({
  booking,
  sessionId,
  demoOtp,
  dict,
  locale,
}: {
  booking: Booking & { workers: Worker };
  sessionId: string;
  demoOtp?: string;
  dict: Dictionary;
  locale: string;
}) {
  const router = useRouter();
  const p = dict.payment;
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  const amount = booking.workers?.expected_salary ?? 0;
  const serviceFee = Math.round(amount * 0.1);
  const total = amount + serviceFee;

  // عدّاد تنازلي لإعادة الإرسال
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  function handleChange(
    index: number,
    e: ChangeEvent<HTMLInputElement>,
  ): void {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    // دعم لصق عدة أرقام دفعة واحدة
    const next = [...digits];
    const chars = val.split("");
    let idx = index;
    for (const ch of chars) {
      if (idx >= OTP_LENGTH) break;
      next[idx] = ch;
      idx++;
    }
    setDigits(next);
    const focusIdx = Math.min(idx, OTP_LENGTH - 1);
    inputsRef.current[focusIdx]?.focus();
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ): void {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(
    e: React.ClipboardEvent<HTMLInputElement>,
  ): void {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < Math.min(pasted.length, OTP_LENGTH); i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputsRef.current[focusIdx]?.focus();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const code = digits.join("");
    if (code.length !== OTP_LENGTH) {
      setError(p.verifyFailed);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": "fp-client",
        },
        body: JSON.stringify({ sessionId, otp: code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(p.verifyFailed);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/account`);
      }, 2500);
    } catch {
      setError(p.verifyFailed);
    } finally {
      setLoading(false);
    }
  }

  function handleResend(): void {
    if (seconds > 0) return;
    // إعادة الإرسال = إعادة بدء جلسة دفع جديدة (نفس البطاقة السابقة)
    setSeconds(RESEND_SECONDS);
    setDigits(Array(OTP_LENGTH).fill(""));
    setError(null);
    // في الوضع التجريبي نعيد توليد رمز عبر استدعاء initiate مجدداً (الرمز يظهر في الـ toast/hint)
    // نكتفي هنا بإعادة العدّاد للحفاظ على البساطة
  }

  if (success) {
    return (
      <div className={styles.layout}>
        <Card className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>{p.verifySuccess}</h1>
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

  return (
    <div className={styles.layout}>
      <div className={styles.header}>
        <h1 className={styles.title}>{p.verifyTitle}</h1>
        <p className={styles.subtitle}>{p.verifySubtitle}</p>
      </div>

      <div className={styles.grid}>
        <Card className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.otpWrap}>
              <label className={styles.otpLabel}>{p.otpLabel}</label>
              <div className={styles.otpInputs} onPaste={handlePaste}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={OTP_LENGTH}
                    value={digits[i]}
                    onChange={(e) => handleChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={styles.otpBox}
                    aria-label={`${p.otpLabel} ${i + 1}`}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              {demoOtp && (
                <div className={styles.demoHint}>
                  {p.demoOtpHint.replace("{{code}}", demoOtp)}
                </div>
              )}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? p.processing : p.verifyBtn}
            </Button>

            <div className={styles.resendRow}>
              {seconds > 0 ? (
                <span className={styles.resendDisabled}>
                  {p.resendIn.replace("{{seconds}}", String(seconds))}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className={styles.resendBtn}
                >
                  {p.resend}
                </button>
              )}
            </div>

            <Link href={`/${locale}/payment/${booking.id}`} className={styles.backLink}>
              ← {p.back}
            </Link>
          </form>
        </Card>

        <Card className={styles.summary}>
          <h2 className={styles.sectionTitle}>{p.worker}</h2>
          <div className={styles.workerCard}>
            <img
              src={booking.workers?.photo_url}
              alt={booking.workers?.full_name}
              className={styles.workerImg}
            />
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
