"use client";

import { useState } from "react";
import Link from "next/link";
import { Dictionary } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatSalary } from "@/lib/utils";
import type { Booking, Worker } from "@/lib/supabase/types";
import styles from "./CheckoutClient.module.css";

export function CheckoutClient({
  booking,
  dict,
  locale,
}: {
  booking: Booking & { workers: Worker };
  dict: Dictionary;
  locale: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const prefix = `/${locale}`;

  return (
    <div className={styles.layout}>
      <Card className={styles.summary}>
        <h2 className={styles.sectionTitle}>{dict.checkout.summary}</h2>
        <div className={styles.row}>
          <span>{dict.payment.bookingRef}</span>
          <strong>{booking.booking_ref}</strong>
        </div>
        <div className={styles.row}>
          <span>الحالة</span>
          <strong>{booking.status}</strong>
        </div>
        <div className={styles.workerCard}>
          <img src={booking.workers.photo_url} alt={booking.workers.full_name} className={styles.workerImg} />
          <div>
            <h3>{booking.workers.full_name}</h3>
            <p>{booking.workers.nationality} · {booking.workers.experience_years} سنة</p>
            <p className={styles.salary}>{formatSalary(booking.workers.expected_salary, locale)}</p>
          </div>
        </div>
      </Card>

      <Card className={styles.terms}>
        <h3>الشروط</h3>
        <p>{booking.terms_snapshot || "—"}</p>
        <h3>سياسة الاسترجاع</h3>
        <p>{booking.return_policy_snapshot || "—"}</p>
      </Card>

      <Card className={styles.actions}>
        <Checkbox
          checked={agreed}
          onChange={(e) => setAgreed((e.target as HTMLInputElement).checked)}
          label={dict.checkout.agreeTerms}
        />
        <Button href={`${prefix}/payment/${booking.id}`} disabled={!agreed} size="lg">
          {dict.checkout.proceedPayment}
        </Button>
      </Card>
    </div>
  );
}
