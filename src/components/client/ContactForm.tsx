"use client";

import { useState } from "react";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Dictionary } from "@/lib/i18n";
import styles from "./ContactForm.module.css";

export function ContactForm({ dict }: { dict: Dictionary }) {
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [refNo, setRefNo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setRefNo(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      full_name: String(data.get("full_name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      service_type: String(data.get("service_type") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    toast.push(dict.contact.sent, "success");
    setRefNo(result.refNo);
    form.reset();
  }

  return (
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <Field label={dict.contact.fullName} error={errors.full_name}>
          <Input name="full_name" required placeholder={dict.contact.fullName} />
        </Field>
        <Field label={dict.contact.phone} error={errors.phone}>
          <Input name="phone" type="tel" required placeholder="+974..." />
        </Field>
      </div>
      <div className={styles.row}>
        <Field label={dict.contact.email} error={errors.email}>
          <Input name="email" type="email" required placeholder="example@mail.com" />
        </Field>
        <Field label={dict.contact.serviceType} error={errors.service_type}>
          <Select name="service_type" required defaultValue="">
            <option value="" disabled>—</option>
            <option value="full-time-live-in">إقامة كاملة</option>
            <option value="housemaids">عاملات منزليات</option>
            <option value="training">تدريب</option>
            <option value="recruitment">توظيف وتعيين</option>
          </Select>
        </Field>
      </div>
      <Field label={dict.contact.message} error={errors.message}>
        <Textarea name="message" required placeholder={dict.contact.message} />
      </Field>
      <div className={styles.actions}>
        <Button type="submit" disabled={loading}>
          {loading ? dict.common.loading : dict.contact.send}
        </Button>
        {refNo && (
          <span className={styles.refNo}>
            {dict.contact.refNo}: <strong>{refNo}</strong>
          </span>
        )}
      </div>
    </form>
  );
}
