"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Dictionary } from "@/lib/i18n";
import { Worker } from "@/lib/supabase/types";
import { getFingerprint } from "@/lib/presence";
import styles from "./BookingForm.module.css";

export function BookingForm({
  worker,
  dict,
  locale,
}: {
  worker: Worker;
  dict: Dictionary;
  locale: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      full_name: String(data.get("full_name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      notes: String(data.get("notes") ?? ""),
      candidateId: worker.id,
    };

    const fingerprint = typeof window !== "undefined" ? getFingerprint() : "ssr";

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-fingerprint": fingerprint,
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (result.errors) {
        setErrors(result.errors);
      } else {
        toast.push(result.error || dict.common.error, "error");
      }
      return;
    }

    toast.push(`${dict.book.bookingCreated} ${result.bookingRef}`, "success");
    router.push(`/${locale}/checkout/${result.bookingId}`);
  }

  return (
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      <Field label={dict.book.fullName} error={errors.full_name}>
        <Input name="full_name" required placeholder={dict.book.fullName} />
      </Field>
      <Field label={dict.book.phone} error={errors.phone}>
        <Input name="phone" type="tel" required placeholder="+974..." />
      </Field>
      <Field label={dict.book.email} error={errors.email}>
        <Input name="email" type="email" required placeholder="example@mail.com" />
      </Field>
      <Field label={dict.book.notes}>
        <Textarea name="notes" placeholder={dict.book.notes} />
      </Field>
      <input type="hidden" name="candidateId" value={worker.id} />
      <p className={styles.notice}>{dict.book.termsNotice}</p>
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? dict.common.loading : dict.book.complete}
      </Button>
    </form>
  );
}
