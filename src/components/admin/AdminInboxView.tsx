"use client";

import { useState } from "react";
import { ClientInboxClient, type InboxClient } from "./ClientInboxClient";
import { ClientDetailPanel } from "./ClientDetailPanel";
import styles from "./AdminInboxView.module.css";

export function AdminInboxView({ clients }: { clients: InboxClient[] }) {
  const [activeId, setActiveId] = useState<string | null>(
    clients.length > 0 ? clients[0].id : null,
  );

  const activeClient = clients.find((c) => c.id === activeId) ?? null;

  function handleBlock(clientId: string, blocked: boolean) {
    // استدعاء API الحظر (يُستخدم نفس endpoint الحظر الموجود)
    fetch("/api/admin/block-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, blocked }),
    }).catch(() => {});
    // تحديث محلي فوري للحالة
    window.location.reload();
  }

  return (
    <div className={styles.layout}>
      <ClientInboxClient
        clients={clients}
        activeId={activeId}
        onSelect={setActiveId}
      />
      <ClientDetailPanel client={activeClient} onBlock={handleBlock} />
    </div>
  );
}
