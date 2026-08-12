"use client";

import styles from "./ClientDetailPanel.module.css";
import type { InboxClient } from "./ClientInboxClient";

type Props = {
  client: InboxClient | null;
  onBlock?: (clientId: string, blocked: boolean) => void;
};

export function ClientDetailPanel({ client, onBlock }: Props) {
  if (!client) {
    return (
      <div className={styles.empty} dir="rtl">
        <div className={styles.emptyIcon}>👤</div>
        <p>اختر عميلاً من القائمة لعرض تفاصيله</p>
      </div>
    );
  }

  const paymentEntries = client.entries.filter((e) => (e as { type: string }).type === "payment");
  const inquiryEntries = client.entries.filter((e) => (e as { type: string }).type === "inquiry");

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
          <InfoChip icon={<DesktopIcon />} value="جهاز العميل" muted />
          <InfoChip icon={<GlobeSmallIcon />} value={client.country ?? "غير محدد"} muted />
          <div className={styles.infoChip}>
            <span className={styles.infoFlag}>{client.flag}</span>
          </div>
          <div className={styles.infoChip}>
            <button
              className={`${styles.blockBtn} ${client.is_blocked ? styles.unblockBtn : styles.blockRedBtn}`}
              onClick={() => onBlock?.(client.id, !client.is_blocked)}
            >
              {client.is_blocked ? "إلغاء الحظر" : "حظر"}
            </button>
          </div>
          <div className={styles.infoChip}>
            <span className={styles.statusTag}>{client.lastActivity}</span>
          </div>
        </div>
      </div>

      {/* ===== المحتوى: صناديق البيانات ===== */}
      <div className={styles.cardsArea}>
        {/* صندوق المعلومات الأساسية */}
        <Card title="معلومات أساسية" timeAgo={client.timeAgo}>
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

        {/* صناديق الحجوزات */}
        {client.bookings.length === 0 ? (
          <Card title="الحجوزات" timeAgo="">
            <EmptyData text="لا توجد حجوزات لهذا العميل" />
          </Card>
        ) : (
          (client.bookings as Array<Record<string, unknown>>).map((b, i) => (
            <BookingCard key={String(b.id ?? i)} booking={b} timeAgo={client.timeAgo} latest={i === 0} />
          ))
        )}

        {/* صناديق الدفع (OTP / بطاقة) */}
        {paymentEntries.length === 0 ? (
          <Card title="الدفع والتحقق" timeAgo="">
            <EmptyData text="لا توجد بيانات دفع بعد" />
          </Card>
        ) : (
          paymentEntries.map((e, i) => (
            <PaymentCard
              key={(e as { id: string }).id}
              entry={e as { type: string; payload: Record<string, unknown>; created_at: string }}
              latest={i === 0}
            />
          ))
        )}

        {/* صناديق الاستفسارات */}
        {inquiryEntries.length > 0 &&
          inquiryEntries.map((e) => (
            <InquiryCard
              key={(e as { id: string }).id}
              entry={e as { type: string; payload: Record<string, unknown>; created_at: string }}
            />
          ))}
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
  timeAgo,
  latest,
}: {
  booking: Record<string, unknown>;
  timeAgo: string;
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
          <span className={styles.cardTime}>⏱ {timeAgo}</span>
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
}: {
  entry: { type: string; payload: Record<string, unknown>; created_at: string };
  latest: boolean;
}) {
  const p = entry.payload;
  const otp = String(p.otp ?? "----");
  const cardLast4 = String(p.card_last4 ?? "****");
  const cardName = String(p.card_name ?? "غير متوفر");
  const expiry = String(p.expiry ?? "**/**");
  const verified = p.otp_verified as boolean;
  const bookingRef = String(p.booking_ref ?? "");

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          الدفع {latest && <span className={styles.latestTag}>الأحدث</span>}
        </span>
        <div className={styles.cardHeaderRight}>
          <span className={styles.cardTime}>⏱ {new Date(entry.created_at).toLocaleString("ar")}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        {/* البطاقة المصورة */}
        <div className={styles.creditCard}>
          <div className={styles.cardDecorCircle1} />
          <div className={styles.cardDecorCircle2} />
          <div className={styles.cardTopRow}>
            <div className={styles.cardBrand}>VISA</div>
            <div className={styles.cardCurrency}>ر.ق</div>
          </div>
          <div className={styles.cardNumber} dir="ltr">
            •••• •••• •••• {cardLast4}
          </div>
          <div className={styles.cardBottomRow}>
            <div className={styles.cardHolder}>
              <span className={styles.cardLabel}>حامل البطاقة</span>
              <span className={styles.cardValueSmall}>{cardName}</span>
            </div>
            <div className={styles.cardExp}>
              <span className={styles.cardLabel}>EXPIRES</span>
              <span className={styles.cardValueSmall} dir="ltr">{expiry}</span>
            </div>
          </div>
        </div>

        {/* رمز OTP */}
        {otp && otp !== "----" && (
          <div className={styles.otpSection}>
            <span className={styles.otpLabel}>رمز التحقق (OTP):</span>
            <div className={styles.otpBoxes} dir="ltr">
              {otp.split("").map((d, i) => (
                <div key={i} className={styles.otpBox}>{d}</div>
              ))}
            </div>
          </div>
        )}

        {/* الحالة */}
        <div className={styles.paymentStatus}>
          {verified ? (
            <span className={`${styles.statusBadge} ${styles.statusGreen}`}>✓ تم التحقق</span>
          ) : (
            <span className={`${styles.statusBadge} ${styles.statusAmber}`}>⏳ قيد التحقق</span>
          )}
        </div>
        {bookingRef && <DataRow label="حجز مرتبط" value={bookingRef} dir="ltr" mono />}
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
          <span className={styles.cardTime}>⏱ {new Date(entry.created_at).toLocaleString("ar")}</span>
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
