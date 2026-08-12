"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFingerprint } from "@/lib/presence";

const FP_COOKIE = "khdm-fp";
const PRESENCE_ROOM = "presence-global";

/**
 * مكوّن تتبّع حضور العميل:
 *  - يُسجّل البصمة في كوكي ليقرأها الـ middleware في فحص الحظر.
 *  - يبعث beacon حضور إلى قناة presence-global عبر Supabase Realtime Presence.
 *  - يحدّث الحالة فوراً عند: الدخول، تبديل التبويب (visibilitychange)،
 *    الخروج (beforeunload / pagehide).
 *  - يُرسل heartbeat خفيف كل 25 ثانية لإبقاء الحضور حياً (Presence
 *    نفسه يدعم ذلك، لكن heartbeat إضافي يضمن دقة "نشط الآن").
 */
export function PresenceTracker() {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const fp = getFingerprint();

    // خزّن البصمة في كوكي ليقرأها الـ middleware (مدة سنة).
    document.cookie = `${FP_COOKIE}=${encodeURIComponent(fp)}; path=/; max-age=31536000; SameSite=Lax`;

    // سجّل الحضور الأولي في الـ API (لإنشاء/تحديث صف العميل + الدولة + الجهاز).
    fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint: fp }),
      keepalive: true,
    }).catch(() => {});

    // اشترك في قناة Presence لإبقاء العميل "متصل" في الذاكرة المشتركة.
    const channel = supabase.channel(PRESENCE_ROOM, {
      config: { presence: { key: fp } },
    });

    const track = (state: "online" | "away") => {
      void channel.track({
        fp,
        state,
        at: new Date().toISOString(),
      });
    };

    channel
      .on("presence", { event: "sync" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ fp, state: "online", at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    // heartbeat دوري لإبقاء الحضور حياً
    const heartbeat = setInterval(() => track("online"), 25000);

    // عند إخفاء التبويب: علّم العميل "بعيد"
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        track("away");
        // أبلغ الـ API بتحديث آخر نشاط (اختياري)
        navigator.sendBeacon?.("/api/presence", JSON.stringify({ fingerprint: fp, state: "away" }));
      } else {
        track("online");
      }
    };

    // عند مغادرة الصفحة: ألغِ التتبّع ليُصبح العميل "غير متصل"
    const onUnload = () => {
      track("away");
      navigator.sendBeacon?.("/api/presence", JSON.stringify({ fingerprint: fp, state: "away" }));
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
      void channel.unsubscribe();
    };
  }, []);

  return null;
}
