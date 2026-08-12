"use client";

import { Button } from "@/components/ui/Button";
import { Dictionary } from "@/lib/i18n";
import styles from "./Hero.module.css";

type HeroContent = {
  title: string;
  highlight: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
};

export function Hero({ dict, content }: { dict: Dictionary; content?: HeroContent }) {
  const title = content?.title ?? "رحّب بمساعدة موثوقة تناسب منزلك في قطر";
  const highlight = content?.highlight ?? "موثوقة";
  const subtitle =
    content?.subtitle ??
    "مكتب استقدام مرخّص ومعتمد يوفر لك مرشحين موثّقين بملفات واضحة وشروط صريحة.";
  const primaryCta = content?.primaryCta ?? dict.nav.browseCandidates;
  const secondaryCta = content?.secondaryCta ?? dict.nav.freeQuote;

  const parts = title.split(highlight);

  return (
    <section className={styles.hero}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.text}>
          <h1 className={styles.title}>
            {parts[0]}
            <span className={styles.highlight}>{highlight}</span>
            {parts[1] ?? ""}
          </h1>
          <p className={styles.subtitle}>{subtitle}</p>
          <div className={styles.ctas}>
            <Button href="/ar/candidates" size="lg">
              {primaryCta}
            </Button>
            <Button href="#contact" variant="outline" size="lg">
              {secondaryCta}
            </Button>
          </div>
          <div className={styles.trust}>
            <span>✓ {dict.home.trustBadge1}</span>
            <span>✓ {dict.home.trustBadge2}</span>
            <span>✓ {dict.home.trustBadge3}</span>
          </div>
        </div>
        <div className={styles.visual}>
          <div className={styles.card}>
            <div className={styles.badge}>موثّق ✓</div>
            <div className={styles.avatar}>✦</div>
            <div className={styles.line} />
            <div className={styles.lineShort} />
          </div>
        </div>
      </div>
    </section>
  );
}
