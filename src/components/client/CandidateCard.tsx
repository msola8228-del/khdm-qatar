"use client";

import Link from "next/link";
import { useState } from "react";
import { Worker } from "@/lib/supabase/types";
import { Dictionary } from "@/lib/i18n";
import { Badge } from "@/components/ui/Badge";
import { whatsappLink } from "@/lib/whatsapp";
import { formatSalary } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import styles from "./CandidateCard.module.css";

export function CandidateCard({
  worker,
  dict,
  locale,
  view,
}: {
  worker: Worker;
  dict: Dictionary;
  locale: string;
  view?: "grid" | "list";
}) {
  const prefix = `/${locale}`;
  const { isFav, toggleFav } = useFavorites();
  const [fav, setFav] = useState(false);

  // sync fav state
  useState(() => {
    setFav(isFav(worker.id));
  });

  const employmentLabel = dict.common[worker.employment_type as keyof typeof dict.common] || worker.employment_type;

  return (
    <div className={`${styles.card} ${view === "list" ? styles.list : ""}`}>
      <div className={styles.imageWrap}>
        <img src={worker.photo_url} alt={worker.full_name} className={styles.image} loading="lazy" />
        <button
          className={`${styles.fav} ${fav ? styles.favActive : ""}`}
          onClick={() => {
            const next = toggleFav(worker.id);
            setFav(next);
          }}
          aria-label="Favorite"
        >
          {fav ? "♥" : "♡"}
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.header}>
          <h3 className={styles.name}>{worker.full_name}</h3>
          {worker.availability === "available" ? (
            <Badge variant="available">{dict.common.available}</Badge>
          ) : (
            <Badge variant="booked">{dict.common.booked}</Badge>
          )}
        </div>
        <p className={styles.meta}>
          {worker.nationality} · {dict.profile.experience}: {worker.experience_years} سنة
        </p>
        <p className={styles.skills}>{worker.skills.join(" · ")}</p>
        <p className={styles.salary}>
          {formatSalary(worker.expected_salary, locale)} / {employmentLabel}
        </p>
        <div className={styles.actions}>
          <Link href={`${prefix}/candidates/${worker.slug}`} className={styles.viewBtn}>
            {dict.common.viewProfile}
          </Link>
          <a
            href={whatsappLink(`مرحباً، أرغب في الاستفسار عن المرشحة ${worker.full_name}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.waBtn}
            aria-label={dict.common.whatsapp}
          >
            WhatsApp
          </a>
          <Link href={`${prefix}/book/${worker.slug}`} className={styles.bookBtn}>
            {dict.common.book}
          </Link>
        </div>
      </div>
    </div>
  );
}
