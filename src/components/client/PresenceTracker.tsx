"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFingerprint } from "@/lib/presence";
import { subscribeToDirectNavigate } from "@/lib/realtime";

const FP_COOKIE = "khdm-fp";
const PRESENCE_ROOM = "presence-global";

/** يستخرج لغة الصفحة الحالية من المسار ليبني رابطاً محلياً باللغة نفسها. */
function getCurrentLocale(): string {
  if (typeof window === "undefined") return "ar";
  const m = window.location.pathname.match(/^\/(ar|en)(?:\/|$)/);
  return m ? m[1] : "ar";
}

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

    // ينفّذ التوجيه إلى صفحة داخل الموقع بنفس لغة الصفحة الحالية.
    const navigateTo = (path: string) => {
      const locale = getCurrentLocale();
      const base = path === "/" ? `/${locale}` : `/${locale}${path}`;
      if (window.location.pathname === base) return;
      window.location.assign(base);
    };

    // أخبر الخادم باستلام التوجيه حتى لا يُعاد تنفيذه لاحقاً (يُعلَّم received_at).
    const ackDirect = (entryId?: string) => {
      if (!entryId) return;
      fetch("/api/direct/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      }).catch(() => {});
    };

    // اشترك في أوامر التوجيه من المدير (لوحة التحكم): عند استلام أمر "navigate"
    // ينتقل العميل فوراً إلى الصفحة المطلوبة.
    const directChannel = subscribeToDirectNavigate(fp, (path, entryId) => {
      ackDirect(entryId);
      navigateTo(path);
    });

    // تحقق من التوجيهات المعلّقة: إن كان المدير قد وجّه العميل إليه وهو غير متصل
    // (خلال آخر 5 دقائق)، يُنفَّذ التوجيه عند فتح الصفحة.
    fetch(`/api/direct/pending?fingerprint=${encodeURIComponent(fp)}`, { cache: "no-store" })
      .then((r) => r.json().catch(() => null))
      .then((data) => {
        if (data?.pending && data.path) navigateTo(String(data.path));
      })
      .catch(() => {});

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
      void directChannel.unsubscribe();
    };
  }, []);

  return null;
}
