"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Locale, dir } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import styles from "./LanguageSwitcher.module.css";

export function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname() || "/";
  const [current, setCurrent] = useState(locale);

  useEffect(() => {
    setCurrent(locale);
  }, [locale]);

  function switchTo(target: Locale) {
    if (target === current) return;
    let newPath = pathname;
    // Replace the leading locale segment
    if (pathname.startsWith("/ar") || pathname.startsWith("/en")) {
      newPath = "/" + target + pathname.slice(3);
    } else {
      newPath = "/" + target + (pathname === "/" ? "" : pathname);
    }
    window.location.href = newPath || "/" + target;
  }

  return (
    <div className={styles.switcher} role="group" aria-label="Language">
      <button
        className={`${styles.btn} ${current === "ar" ? styles.active : ""}`}
        onClick={() => switchTo("ar")}
        aria-pressed={current === "ar"}
      >
        ع
      </button>
      <button
        className={`${styles.btn} ${current === "en" ? styles.active : ""}`}
        onClick={() => switchTo("en")}
        aria-pressed={current === "en"}
      >
        EN
      </button>
    </div>
  );
}

export { dir };
