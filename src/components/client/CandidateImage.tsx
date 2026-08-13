"use client";

import { useState } from "react";
import { Worker } from "@/lib/supabase/types";
import { translateNationality } from "@/lib/translate";
import styles from "./CandidateImage.module.css";

// ألوان حسب الجنسية لتوليد صورة رمزية احترافية
const NATIONALITY_COLORS: Record<string, [string, string]> = {
  "فلبينية": ["#1B3A5C", "#C8A04A"],
  "Filipina": ["#1B3A5C", "#C8A04A"],
  "إثيوبية": ["#142C46", "#B08A3A"],
  "Ethiopian": ["#142C46", "#B08A3A"],
  "أوغندية": ["#2C5282", "#D69E2E"],
  "Ugandan": ["#2C5282", "#D69E2E"],
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getColors(nationality: string): [string, string] {
  return NATIONALITY_COLORS[nationality] ?? ["#1B3A5C", "#C8A04A"];
}

/**
 * مكوّن صورة العاملة — يستخدم صورة حقيقية إن وُجدت (photo_url محلي/مرخّص)،
 * وإلا يُولّد صورة SVG رمزية احترافية بالأحرف الأولى ولون الجنسية.
 * يتضمن skeleton أثناء التحميل و fallback واضح عند الفشل.
 */
export function CandidateImage({
  worker,
  className,
  alt,
  locale = "ar",
}: {
  worker: Pick<Worker, "full_name" | "nationality" | "photo_url">;
  className?: string;
  alt?: string;
  locale?: "ar" | "en";
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    worker.photo_url ? "loading" : "error"
  );
  const [bg, fg] = getColors(worker.nationality);
  const initials = getInitials(worker.full_name);
  const nationalityLabel = translateNationality(worker.nationality, locale);
  const altText = alt ?? `${worker.full_name} — ${nationalityLabel}`;

  // إذا لم توجد صورة أو كانت من pravatar (تجريبية)، اعرض الصورة الرمزية
  const isValidPhoto =
    worker.photo_url &&
    !worker.photo_url.includes("pravatar.cc") &&
    !worker.photo_url.includes("placehold.co");

  if (!isValidPhoto || status === "error") {
    return (
      <div
        className={`${styles.avatar} ${className ?? ""}`}
        style={{ background: `linear-gradient(135deg, ${bg}, ${fg})` }}
        role="img"
        aria-label={altText}
      >
        <span className={styles.initials}>{initials}</span>
        <span className={styles.nationality}>{nationalityLabel}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      {status === "loading" && <div className={styles.skeleton} aria-hidden="true" />}
      <img
        src={worker.photo_url}
        alt={altText}
        className={`${styles.image} ${status === "loaded" ? styles.visible : ""}`}
        loading="lazy"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  );
}
