"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function getFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  const storageKey = "test-web-fingerprint";
  let fp = localStorage.getItem(storageKey);
  if (!fp) {
    const nav = navigator;
    const seed = [
      nav.userAgent,
      nav.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      nav.hardwareConcurrency || 0,
    ].join("|");
    fp = btoa(seed).slice(0, 24);
    localStorage.setItem(storageKey, fp);
  }
  return fp;
}

export function usePresence() {
  const [activeCount, setActiveCount] = useState(0);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const fp = getFingerprint();
    const channel = supabase.channel("presence-global", {
      config: { presence: { key: fp } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setActiveCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ fp, at: new Date().toISOString() });
        }
      });
    channelRef.current = channel;

    return () => {
      void channel.unsubscribe();
    };
  }, []);

  return activeCount;
}

export async function registerDailyVisit(fingerprint: string) {
  const supabase = createClient();
  const { error } = await supabase.from("daily_visitors").upsert(
    {
      date: new Date().toISOString().slice(0, 10),
      fingerprint,
    },
    { onConflict: "date,fingerprint" },
  );
  if (error) console.warn("daily_visitors upsert failed:", error.message);
}

export async function ensureClient(
  fingerprint: string,
  meta: { ip?: string | null; country?: string | null; name?: string; email?: string; phone?: string },
) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (meta.ip) updates.ip = meta.ip;
    if (meta.country) updates.country = meta.country;
    if (meta.name) updates.name = meta.name;
    if (meta.email) updates.email = meta.email;
    if (meta.phone) updates.phone = meta.phone;
    if (Object.keys(updates).length) {
      await supabase.from("clients").update(updates).eq("id", existing.id);
    }
    return existing.id;
  }
  const { data, error } = await supabase
    .from("clients")
    .insert({
      fingerprint,
      ip: meta.ip ?? null,
      country: meta.country ?? null,
      name: meta.name ?? null,
      email: meta.email ?? null,
      phone: meta.phone ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("ensureClient insert failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}
