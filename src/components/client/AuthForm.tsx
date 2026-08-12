"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Dictionary } from "@/lib/i18n";
import styles from "./AuthForm.module.css";

export function AuthForm({
  mode,
  dict,
  locale,
}: {
  mode: "login" | "register";
  dict: Dictionary;
  locale: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    const supabase = createClient();
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (result.error) {
      toast.push(result.error.message, "error");
      return;
    }

    toast.push(mode === "login" ? dict.auth.loginSuccess : dict.auth.registerSuccess, "success");
    router.push(`/${locale}/account`);
    router.refresh();
  }

  return (
    <div className={styles.wrapper}>
      <form onSubmit={onSubmit} className={styles.form} noValidate>
        <h1 className={styles.title}>
          {mode === "login" ? dict.auth.loginTitle : dict.auth.registerTitle}
        </h1>
        <Field label={dict.auth.email}>
          <Input name="email" type="email" required placeholder="example@mail.com" />
        </Field>
        <Field label={dict.auth.password}>
          <Input name="password" type="password" required minLength={6} placeholder="••••••" />
        </Field>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? dict.common.loading : mode === "login" ? dict.auth.login : dict.auth.register}
        </Button>
      </form>
    </div>
  );
}
