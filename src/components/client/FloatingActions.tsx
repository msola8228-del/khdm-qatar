"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/config/site";
import { whatsappLink, isWhatsappEnabled } from "@/lib/whatsapp";
import { createClient } from "@/lib/supabase/client";
import styles from "./FloatingActions.module.css";

type Settings = { number: string; enabled: boolean } | null;

export function FloatingActions({ locale = "ar" }: { locale?: string }) {
  const [enabled, setEnabled] = useState<boolean>(SITE.whatsappEnabled);
  const isAr = locale === "ar";
  const msg = isAr ? "مرحباً، أرغب في الاستفسار عن خدماتكم." : "Hello, I would like to inquire about your services.";

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    supabase
      .from("settings")
      .select("value")
      .eq("key", "whatsapp")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setEnabled(isWhatsappEnabled(data.value as unknown as Settings ?? undefined));
      });
    channel = supabase
      .channel("whatsapp-setting")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings", filter: "key=eq.whatsapp" },
        (payload) => {
          const v = (payload.new as { value: Settings }).value;
          if (v) setEnabled(isWhatsappEnabled(v));
        },
      )
      .subscribe();
    return () => {
      void channel?.unsubscribe();
    };
  }, []);

  if (!enabled) return null;

  return (
    <a
      href={whatsappLink(msg)}
      className={styles.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={isAr ? "تواصل عبر واتساب" : "Contact via WhatsApp"}
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12 2a10 10 0 0 0-8.65 14.99L2 22l5.16-1.35A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.06.8.82-2.98-.2-.31A8.2 8.2 0 1 1 12 20.2z" />
      </svg>
    </a>
  );
}

