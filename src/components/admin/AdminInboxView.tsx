"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClientInboxClient, type InboxClient } from "./ClientInboxClient";
import { ClientDetailPanel } from "./ClientDetailPanel";
import { createClient } from "@/lib/supabase/client";
import { subscribeToNewEntries } from "@/lib/realtime";
import styles from "./AdminInboxView.module.css";

const PRESENCE_ROOM = "presence-global";

export function AdminInboxView({ clients }: { clients: InboxClient[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(
    clients.length > 0 ? clients[0].id : null,
  );
  // نسخة محلية قابلة للتحديث لحظياً عند وصول entries جديدة (دفع/OTP).
  // تُزامَن مع الـ props القادمة من الخادم عند كل router.refresh()
  // حتى يظهر العملاء الجدد والتحديثات دون إعادة تحميل الصفحة.
  const [liveClientList, setLiveClientList] = useState<InboxClient[]>(clients);
  // مجموعة البصمات النشطة الآن (من قناة presence)
  const [onlineFps, setOnlineFps] = useState<Set<string>>(new Set());
  // منع تكرار router.refresh() خلال فترة قصيرة (debounce) عند تدفّق إشعارات.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // مزامنة القائمة المحلية مع الـ props الجديدة من الخادم بعد router.refresh().
  // هذا يُظهر العملاء الجدد والتحديثات فوراً.
  useEffect(() => {
    setLiveClientList(clients);
  }, [clients]);

  // اشترك في قناة presence لعرض النشطين لحظياً
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(PRESENCE_ROOM, {
      config: { presence: { key: "admin" } },
    });

    const sync = () => {
      const state = channel.presenceState<{ fp?: string; state?: string }>();
      const next = new Set<string>();
      for (const key of Object.keys(state)) {
        const presences = state[key];
        for (const p of presences) {
          if (p.state === "online" && p.fp) next.add(p.fp);
        }
      }
      setOnlineFps(next);
    };

    channel.on("presence", { event: "sync" }, sync);
    channel.on("presence", { event: "join" }, sync);
    channel.on("presence", { event: "leave" }, sync);
    channel.subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, []);

  // عند وصول إشعار "entry جديد" (دفع/OTP): أعد جلب لوحة الإدارة من الخادم.
  // router.refresh() يُعيد تشغيل الـ server component فقط (دون إعادة تحميل الصفحة)
  // فيجلب العملاء الجدد والـ entries المُحدّثة، ثم يُزامن الـ effect أعلاه القائمة.
  // نستخدم debounce لتفادي تكرار الطلب عند تدفّق عدة إشعارات متتالية.
  const triggerRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      router.refresh();
    }, 400);
  }, [router]);

  // اشترك في إشعارات "entry جديد" لتظهر في اللوحة لحظياً دون polling.
  useEffect(() => {
    const channel = subscribeToNewEntries(() => {
      triggerRefresh();
    });
    return () => {
      void channel.unsubscribe();
    };
  }, [triggerRefresh]);

  // ادمج حالة "نشط الآن" مع البيانات الأساسية
  const liveClients = liveClientList.map((c) => ({
    ...c,
    active: onlineFps.has(c.fingerprint) || c.active,
  }));

  const activeClient = liveClients.find((c) => c.id === activeId) ?? null;

  // ===== معالجات الإجراءات =====
  async function handleBlock(clientId: string, blocked: boolean) {
    await fetch("/api/admin/block-client", {
      method: blocked ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blocked ? { clientId } : { clientId }),
    }).catch(() => {});
    window.location.reload();
  }

  async function handleBulkBlock(ids: string[]) {
    await Promise.all(
      ids.map((id) =>
        fetch("/api/admin/block-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: id }),
        }).catch(() => {}),
      ),
    );
    window.location.reload();
  }

  async function handleArchive(ids: string[]) {
    // افصل بين الأرشفة وإلغاء الأرشفة (المُحدّدة بـ "un:")
    const toArchive = ids.filter((id) => !id.startsWith("un:"));
    const toUnarchive = ids.filter((id) => id.startsWith("un:")).map((id) => id.slice(3));
    await Promise.all([
      ...toArchive.map((id) =>
        fetch("/api/admin/archive-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: id, action: "archive" }),
        }).catch(() => {}),
      ),
      ...toUnarchive.map((id) =>
        fetch("/api/admin/archive-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: id, action: "unarchive" }),
        }).catch(() => {}),
      ),
    ]);
    window.location.reload();
  }

  // أرشفة/إلغاء أرشفة عميل واحد من لوحة التفاصيل
  async function handleArchiveSingle(clientId: string, archive: boolean) {
    await fetch("/api/admin/archive-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, action: archive ? "archive" : "unarchive" }),
    }).catch(() => {});
    window.location.reload();
  }

  async function handleDelete(ids: string[]) {
    await fetch("/api/admin/delete-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientIds: ids }),
    }).catch(() => {});
    window.location.reload();
  }

  // حذف عميل واحد من لوحة التفاصيل
  async function handleDeleteSingle(clientId: string) {
    await fetch("/api/admin/delete-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientIds: [clientId] }),
    }).catch(() => {});
    window.location.reload();
  }

  // تحديث حالة entry محلياً بعد قرار المدير (موافقة/رفض) دون إعادة تحميل الصفحة.
  const handleEntryDecided = useCallback(
    (entryId: string, status: "approved" | "rejected") => {
      setLiveClientList((prev) =>
        prev.map((c) => {
          const entries = (c.entries as Array<Record<string, unknown>>) ?? [];
          let changed = false;
          const nextEntries = entries.map((e) => {
            if ((e as { id?: string })?.id !== entryId) return e;
            changed = true;
            const payload = (e.payload as Record<string, unknown>) ?? {};
            return {
              ...e,
              payload: { ...payload, status },
            };
          });
          return changed ? { ...c, entries: nextEntries } : c;
        }),
      );
    },
    [],
  );

  return (
    <div className={styles.layout}>
      <ClientInboxClient
        clients={liveClients}
        activeId={activeId}
        onSelect={setActiveId}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onBlock={handleBulkBlock}
      />
      <ClientDetailPanel
        client={activeClient}
        onBlock={handleBlock}
        onArchive={handleArchiveSingle}
        onDelete={handleDeleteSingle}
        onEntryDecided={handleEntryDecided}
      />
    </div>
  );
}
