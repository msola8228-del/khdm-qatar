"use client";

import { useState, useEffect, useRef } from "react";
import { ClientInboxClient, type InboxClient } from "./ClientInboxClient";
import { ClientDetailPanel } from "./ClientDetailPanel";
import { createClient } from "@/lib/supabase/client";
import styles from "./AdminInboxView.module.css";

const PRESENCE_ROOM = "presence-global";

export function AdminInboxView({ clients }: { clients: InboxClient[] }) {
  const [activeId, setActiveId] = useState<string | null>(
    clients.length > 0 ? clients[0].id : null,
  );
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

  // ادمج حالة "نشط الآن" مع البيانات الأساسية
  const liveClients = clients.map((c) => ({
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
      />
    </div>
  );
}
