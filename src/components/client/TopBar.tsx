import { SITE } from "@/config/site";
import { Dictionary } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import styles from "./TopBar.module.css";

export function TopBar({ locale, dict }: { locale: string; dict: Dictionary }) {
  return (
    <div className={styles.topbar}>
      <div className={`container ${styles.inner}`}>
        <span className={styles.flag}>🇶🇦</span>
        <span className={styles.text}>{SITE.taglineAr}</span>
        <div className={styles.actions}>
          <a href={`tel:${SITE.phone}`} className={styles.phone}>
            {SITE.phone}
          </a>
          <LanguageSwitcher locale={locale} />
        </div>
      </div>
    </div>
  );
}
