"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import styles from "./BlockClientClient.module.css";

type Client = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  ip: string | null;
  country: string | null;
  fingerprint: string;
  created_at: string;
  is_blocked: boolean;
};

type Blocked = {
  id: string;
  ip: string | null;
  fingerprint: string | null;
  reason: string | null;
  created_at: string;
};

export function BlockClientClient({
  recentClients,
  blocked,
}: {
  recentClients: Client[];
  blocked: Blocked[];
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [blockType, setBlockType] = useState<"ip" | "fingerprint">("fingerprint");
  const [blockValue, setBlockValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const ip = String(data.get("ip") ?? "") || null;
    const fingerprint = String(data.get("fingerprint") ?? "") || null;
    const reasonVal = String(data.get("reason") ?? "") || null;

    const res = await fetch("/api/admin/block-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, fingerprint, reason: reasonVal }),
    });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.push(result.error || "فشل الحظر", "error");
      return;
    }
    toast.push("تم حظر العميل", "success");
    form.reset();
    setReason("");
  }

  return (
    <div>
      <h1 className={styles.title}>حظر عميل</h1>

      <Card className={styles.form}>
        <h2 className={styles.sectionTitle}>حظر يدوي</h2>
        <form onSubmit={submit} className={styles.formGrid}>
          <Field label="بصمة المتصفح (fingerprint)">
            <Input name="fingerprint" placeholder="Fingerprint..." />
          </Field>
          <Field label="IP (اختياري)">
            <Input name="ip" placeholder="مثال: 94.123.45.6" />
          </Field>
          <Field label="السبب">
            <Textarea name="reason" placeholder="سبب الحظر..." />
          </Field>
          <Button type="submit" disabled={loading}>
            {loading ? "جارٍ..." : "حظر العميل"}
          </Button>
        </form>
      </Card>

      <h2 className={styles.sectionTitle}>عملاء تم حظرهم</h2>
      {blocked.length === 0 ? (
        <Card><p className={styles.empty}>لا يعملة محظورون.</p></Card>
      ) : (
        <Card className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>IP</th>
                <th>Fingerprint</th>
                <th>السبب</th>
                <th>التاريخ</th>
                <th>إلغاء</th>
              </tr>
            </thead>
            <tbody>
              {blocked.map((b) => (
                <tr key={b.id}>
                  <td>{b.ip || "—"}</td>
                  <td className={styles.fpCell}>{b.fingerprint?.slice(0, 12)}…</td>
                  <td>{b.reason || "—"}</td>
                  <td>{new Date(b.created_at).toLocaleDateString("ar-QA")}</td>
                  <td>
                    <UnblockButton id={b.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <h2 className={styles.sectionTitle}>آخر 20 عميل</h2>
      <Card className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الهاتف</th>
              <th>IP</th>
              <th>الدولة</th>
              <th>Fingerprint</th>
              <th>التاريخ</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {recentClients.map((c) => (
              <tr key={c.id}>
                <td>{c.name || "—"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.phone || "—"}</td>
                <td>{c.ip || "—"}</td>
                <td>{c.country || "—"}</td>
                <td className={styles.fpCell}>{c.fingerprint.slice(0, 12)}…</td>
                <td>{new Date(c.created_at).toLocaleDateString("ar-QA")}</td>
                <td>
                  {c.is_blocked ? (
                    <span className={styles.badge}>محظور</span>
                  ) : (
                    <button
                      className={styles.blockBtn}
                      onClick={() => {
                        navigator.clipboard?.writeText(c.fingerprint);
                        toast.push("تم نسخ البصمة", "success");
                      }}
                    >
                      نسخ
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function UnblockButton({ id }: { id: string }) {
  const toast = useToast();
  return (
    <button
      className={styles.unblockBtn}
      onClick={async () => {
        const res = await fetch("/api/admin/block-client", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (res.ok) {
          toast.push("تم رفع الحظر", "success");
          window.location.reload();
        } else {
          toast.push("فشل", "error");
        }
      }}
    >
      رفع
    </button>
  );
}
