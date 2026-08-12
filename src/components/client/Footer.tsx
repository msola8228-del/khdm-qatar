import Link from "next/link";
import { SITE } from "@/config/site";
import { Dictionary } from "@/lib/i18n";
import styles from "./Footer.module.css";

export function Footer({ dict, locale }: { dict: Dictionary; locale: string }) {
  const prefix = `/${locale}`;
  const year = new Date().getFullYear();
  const isAr = locale === "ar";
  const brandName = isAr ? SITE.nameAr : SITE.nameEn;
  const tagline = isAr ? SITE.taglineAr : SITE.taglineEn;
  const address = isAr ? SITE.addressAr : SITE.addressEn;
  const workingHours = isAr ? SITE.workingHoursAr : SITE.workingHoursEn;
  const natLabel = isAr
    ? { filipina: "مساعدة فلبينية", ethiopian: "مساعدة إثيوبية", ugandan: "مساعدة أوغندية" }
    : { filipina: "Filipina maid", ethiopian: "Ethiopian maid", ugandan: "Ugandan maid" };
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.col}>
          <h4 className={styles.title}>{brandName}</h4>
          <p className={styles.desc}>{tagline}</p>
          <p className={styles.text}>{address}</p>
          <p className={styles.text}>{workingHours}</p>
          <p className={styles.text}>{isAr ? `رقم الترخيص: ${SITE.licenseNumber}` : `License: ${SITE.licenseNumber}`}</p>
        </div>

        <div className={styles.col}>
          <h4 className={styles.title}>{dict.footer.ourWorkers}</h4>
          <ul className={styles.links}>
            <li><Link href={`${prefix}/categories/filipina`}>{natLabel.filipina}</Link></li>
            <li><Link href={`${prefix}/categories/ethiopian`}>{natLabel.ethiopian}</Link></li>
            <li><Link href={`${prefix}/categories/ugandan`}>{natLabel.ugandan}</Link></li>
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
            <input name="email" type="email" placeholder={dict.newsletter.placeholder} className={styles.input} required aria-label={dict.newsletter.placeholder} />
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
          <p>{dict.footer.rights.replace("{{year}}", String(year)).replace("{{name}}", brandName)}</p>
        </div>
      </div>
    </footer>
  );
}
