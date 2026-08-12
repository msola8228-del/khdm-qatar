import Link from "next/link";
import { SITE } from "@/config/site";
import { Dictionary } from "@/lib/i18n";
import styles from "./Footer.module.css";

export function Footer({ dict, locale }: { dict: Dictionary; locale: string }) {
  const prefix = `/${locale}`;
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.col}>
          <h4 className={styles.title}>{SITE.name}</h4>
          <p className={styles.desc}>{SITE.taglineAr}</p>
          <p className={styles.text}>{SITE.addressAr}</p>
          <p className={styles.text}>{SITE.workingHoursAr}</p>
        </div>

        <div className={styles.col}>
          <h4 className={styles.title}>{dict.footer.ourWorkers}</h4>
          <ul className={styles.links}>
            <li><Link href={`${prefix}/categories/filipina`}>مساعدة فلبينية</Link></li>
            <li><Link href={`${prefix}/categories/ethiopian`}>مساعدة إثيوبية</Link></li>
            <li><Link href={`${prefix}/categories/ugandan`}>مساعدة أوغندية</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h4 className={styles.title}>{dict.footer.company}</h4>
          <ul className={styles.links}>
            <li><Link href={`${prefix}/about`}>{dict.common.about}</Link></li>
            <li><Link href={`${prefix}/services`}>{dict.common.services}</Link></li>
            <li><Link href={`${prefix}/blog`}>{dict.common.blog}</Link></li>
            <li><Link href={`${prefix}/terms`}>{dict.common.terms || "الشروط"}</Link></li>
            <li><Link href={`${prefix}/privacy`}>{dict.common.privacy || "الخصوصية"}</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h4 className={styles.title}>{dict.newsletter.title}</h4>
          <form className={styles.news} action="/api/newsletter" method="POST">
            <input name="email" type="email" placeholder={dict.newsletter.placeholder} className={styles.input} required />
            <button type="submit" className={styles.btn}>{dict.newsletter.subscribe}</button>
          </form>
          <div className={styles.social}>
            <a href={SITE.social.facebook} aria-label="Facebook">f</a>
            <a href={SITE.social.instagram} aria-label="Instagram">ig</a>
            <a href={SITE.social.linkedin} aria-label="LinkedIn">in</a>
            <a href={SITE.social.tiktok} aria-label="TikTok">tt</a>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <div className={`container`}>
          <p>{dict.footer.rights.replace("{{year}}", String(year)).replace("{{name}}", SITE.name)}</p>
        </div>
      </div>
    </footer>
  );
}
