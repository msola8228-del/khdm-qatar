"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Dictionary } from "@/lib/i18n";
import { Worker } from "@/lib/supabase/types";
import { CandidateCard } from "@/components/client/CandidateCard";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import styles from "./CandidatesPageClient.module.css";

const NATIONALITIES = ["all", "فلبينية", "إثيوبية", "أوغندية"];
const LANGUAGES = ["all", "العربية", "الإنجليزية", "الأمهرية", "التاغالوغية", "السواحيلية"];
const RELIGIONS = ["all", "مسلمة", "مسيحية"];
const AVAILABILITY = ["all", "available", "booked"];

export function CandidatesPageClient({
  dict,
  locale,
  initial,
}: {
  dict: Dictionary;
  locale: string;
  initial: Worker[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [workers, setWorkers] = useState<Worker[]>(initial);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initial.length);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const q = searchParams.get("q") || "";
  const nationality = searchParams.get("nationality") || "all";
  const language = searchParams.get("language") || "all";
  const religion = searchParams.get("religion") || "all";
  const availability = searchParams.get("availability") || "all";
  const sort = searchParams.get("sort") || "recommended";
  const view = (searchParams.get("view") as "grid" | "list") || "grid";

  // Debounced search effect.
  useEffect(() => {
    const term = q;
    if (!term && term !== "") return;
    const timer = setTimeout(() => fetchWorkers(1, true), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, nationality, language, religion, availability, sort]);

  async function fetchWorkers(p: number, reset: boolean) {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nationality !== "all") params.set("nationality", nationality);
    if (language !== "all") params.set("language", language);
    if (religion !== "all") params.set("religion", religion);
    if (availability !== "all") params.set("availability", availability);
    if (sort) params.set("sort", sort);
    params.set("page", String(p));
    params.set("pageSize", "12");

    const res = await fetch(`/api/candidates?${params.toString()}`);
    const data = await res.json();
    if (reset) {
      setWorkers(data.items);
    } else {
      setWorkers((prev) => [...prev, ...data.items]);
    }
    setTotal(data.total);
    setPage(p);
    setLoading(false);
  }

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all" && value !== "") next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function resetAll() {
    router.replace(`${pathname}`, { scroll: false });
  }

  const hasMore = workers.length < total;

  const Filters = (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{dict.candidates.nationality}</span>
        <div className={styles.chips}>
          {NATIONALITIES.map((n) => (
            <button
              key={n}
              className={`${styles.chip} ${nationality === n ? styles.chipActive : ""}`}
              onClick={() => updateParam("nationality", n)}
            >
              {n === "all" ? dict.candidates.all : n}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{dict.candidates.language}</span>
        <div className={styles.chips}>
          {LANGUAGES.map((l) => (
            <button
              key={l}
              className={`${styles.chip} ${language === l ? styles.chipActive : ""}`}
              onClick={() => updateParam("language", l)}
            >
              {l === "all" ? dict.candidates.all : l}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{dict.candidates.religion}</span>
        <div className={styles.chips}>
          {RELIGIONS.map((r) => (
            <button
              key={r}
              className={`${styles.chip} ${religion === r ? styles.chipActive : ""}`}
              onClick={() => updateParam("religion", r)}
            >
              {r === "all" ? dict.candidates.all : r}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{dict.candidates.availability}</span>
        <div className={styles.chips}>
          {AVAILABILITY.map((a) => (
            <button
              key={a}
              className={`${styles.chip} ${availability === a ? styles.chipActive : ""}`}
              onClick={() => updateParam("availability", a)}
            >
              {a === "all" ? dict.candidates.all : a === "available" ? dict.common.available : dict.common.booked}
            </button>
          ))}
        </div>
      </div>
      <button className={styles.reset} onClick={resetAll}>
        {dict.common.reset}
      </button>
    </div>
  );

  return (
    <div className="container section">
      <h1 className="section-title">{dict.common.candidates}</h1>
      <p className="section-subtitle">{locale === "ar" ? "اختر المرشحة المناسبة لاحتياجك" : "Choose the right candidate"}</p>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder={dict.candidates.searchPlaceholder}
          defaultValue={q}
          onChange={(e) => updateParam("q", e.target.value)}
          aria-label={dict.common.search}
        />
        <select
          className={styles.sort}
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
          aria-label={dict.common.sort}
        >
          <option value="recommended">{dict.candidates.sortRecommended}</option>
          <option value="salary_asc">{dict.candidates.sortSalaryAsc}</option>
          <option value="salary_desc">{dict.candidates.sortSalaryDesc}</option>
          <option value="experience">{dict.candidates.sortExperience}</option>
          <option value="name">{dict.candidates.sortName}</option>
        </select>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === "grid" ? styles.viewActive : ""}`}
            onClick={() => updateParam("view", "grid")}
            aria-label={dict.common.grid}
          >
            ▦
          </button>
          <button
            className={`${styles.viewBtn} ${view === "list" ? styles.viewActive : ""}`}
            onClick={() => updateParam("view", "list")}
            aria-label={dict.common.list}
          >
            ☰
          </button>
        </div>
        <button className={styles.filterBtn} onClick={() => setDrawerOpen(true)}>
          ⚙ {dict.common.filter}
        </button>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>{Filters}</aside>
        <div>
          {loading && workers.length === 0 ? (
            <LoadingSkeleton />
          ) : workers.length === 0 ? (
            <div className={styles.empty}>
              <p>{dict.common.noResults}</p>
              <Button href="#contact" variant="outline" size="sm">
                {dict.candidates.needHelp}
              </Button>
            </div>
          ) : (
            <>
              <div className={view === "list" ? styles.listGrid : styles.grid}>
                {workers.map((w) => (
                  <CandidateCard key={w.id} worker={w} dict={dict} locale={locale} view={view} />
                ))}
              </div>
              {hasMore && (
                <div style={{ textAlign: "center", marginTop: 32 }}>
                  <button
                    className={styles.loadMore}
                    onClick={() => fetchWorkers(page + 1, false)}
                    disabled={loading}
                  >
                    {loading ? dict.common.loading : dict.common.showMore}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h3>{dict.common.filter}</h3>
              <button onClick={() => setDrawerOpen(false)} aria-label="إغلاق">✕</button>
            </div>
            {Filters}
          </div>
        </div>
      )}
    </div>
  );
}
