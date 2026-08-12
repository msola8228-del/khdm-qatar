"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ClientInboxClient, type InboxClient } from "./ClientInboxClient";
import { ClientDetailPanel } from "./ClientDetailPanel";
import { createClient } from "@/lib/supabase/client";
import { subscribeToNewEntries } from "@/lib/realtime";
import styles from "./AdminInboxView.module.css";

const PRESENCE_ROOM = "presence-global";

export function AdminInboxView({ clients }: { clients: InboxClient[] }) {
  const [activeId, setActiveId] = useState<string | null>(
    clients.length > 0 ? clients[0].id : null,
  );
  // نسخة محلية قابلة للتحديث لحظياً عند وصول entries جديدة (دفع/OTP)
  const [liveClientList, setLiveClientList] = useState<InboxClient[]>(clients);
  // مجموعة البصمات النشطة الآن (من قناة presence)
  const [onlineFps, setOnlineFps] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

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

    channelRef.current = channel;
    return () => {
      void channel.unsubscribe();
    };
  }, []);

  // جلب entry جديد وإدراجه في قائمة العميل المعني لحظياً (دفع/OTP).
  const upsertNewEntry = useCallback(async (entryId: string, clientId?: string | null) => {
    if (!entryId) return;
    const supabase = createClient();
    const { data: entry } = await supabase
      .from("client_data_entries")
      .select("id, client_id, type, payload, created_at")
      .eq("id", entryId)
      .maybeSingle();
    if (!entry) return;
    const cid = clientId ?? (entry.client_id as string | null);
    setLiveClientList((prev) => {
      const idx = prev.findIndex((c) => c.id === cid);
      if (idx === -1) {
        // عميل غير موجود في القائمة المحلية — قد يكون جديد/غير محمّل؛
        // تجاهل (سيظهر عند إعادة فتح الصفحة).
        return prev;
      }
      const existing = prev[idx];
      const entries = (existing.entries as unknown[]) ?? [];
      // تجنّب التكرار إن كان موجوداً.
      if (entries.some((e) => (e as { id?: string })?.id === entry.id)) return prev;
      const updated = {
        ...existing,
        entries: [entry, ...entries],
        // حدّث آخر نشاط لو ظهر في الترتيب.
      };
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }, []);

  // اشترك في إشعارات "entry جديد" لتظهر في اللوحة لحظياً دون polling.
  useEffect(() => {
    const channel = subscribeToNewEntries((payload) => {
      if (payload.entryId) void upsertNewEntry(payload.entryId, payload.clientId);
    });
    return () => {
      void channel.unsubscribe();
    };
  }, [upsertNewEntry]);

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
