import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/client/Hero";
import { Stats } from "@/components/client/Stats";
import { ServiceCards } from "@/components/client/ServiceCards";
import { CandidateCard } from "@/components/client/CandidateCard";
import { Accordion } from "@/components/ui/Accordion";
import { Card } from "@/components/ui/Card";
import { getDictionary } from "@/lib/i18n";
import { SITE } from "@/config/site";
import styles from "./page.module.css";
import Link from "next/link";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const isAr = locale === "ar";

  const supabase = createClient();
  const { data: workers } = await supabase
    .from("workers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: pageRows } = await supabase
    .from("page_content")
    .select("*")
    .eq("page", "home")
    .eq("locale", locale);

  const content: Record<string, Record<string, unknown>> = {};
  pageRows?.forEach((row) => {
    content[row.section] = row.content as Record<string, unknown>;
  });

  const hero = content.hero as Parameters<typeof Hero>[0]["content"];
  const stats = content.stats as Parameters<typeof Stats>[0]["content"];
  const services = content.services as { items: { title: string; desc: string }[] };
  const whyChoose = content.why_choose as { items: { title: string; desc: string }[] };
  const howItWorks = content.how_it_works as { items: { step: string; title: string; desc: string }[] };
  const pricing = content.pricing as { title: string; note: string; ctaPrimary: string; ctaSecondary: string };
  const testimonials = content.testimonials as { items: { name: string; text: string; rating: number }[] };
  const faq = content.faq as { items: { q: string; a: string }[] };
  const contact = content.contact as { title: string; subtitle: string };

  const trustBadges = (content.trust_badges as { items: string[] })?.items ?? [
    dict.home.trustBadge1,
    dict.home.trustBadge2,
    dict.home.trustBadge3,
    dict.home.trustBadge4,
  ];

  return (
    <div>
      <Hero dict={dict} locale={locale} content={hero} />

      {/* شارات ثقة */}
      <section className={styles.trustBar}>
        <div className="container">
          <div className={styles.trustBadges}>
            {trustBadges.map((badge, i) => (
              <span key={i} className={styles.trustBadge}>
                ✓ {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* معلومات الترخيص */}
      <section className={styles.licenseBar}>
        <div className="container">
          <div className={styles.licenseRow}>
            <span className={styles.licenseItem}>📋 {isAr ? "ترخيص رسمي" : "Official license"}: {SITE.licenseNumber}</span>
            <span className={styles.licenseItem}>⏱ {isAr ? "مدة الاستقدام" : "Recruitment duration"}: {SITE.recruitmentDurationWeeks} {isAr ? "أسابيع" : "weeks"}</span>
            <span className={styles.licenseItem}>🔄 {isAr ? "سياسة استبدال" : "Replacement policy"}: {isAr ? "خلال فترة التجربة" : "during probation"}</span>
          </div>
        </div>
      </section>

      {/* بطاقات الخدمات */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">{isAr ? "خدماتنا" : "Our Services"}</h2>
          <p className="section-subtitle">{isAr ? "باقة خدمات متكاملة للاستقدام والتوظيف المنزلي" : "Comprehensive recruitment and domestic staffing services"}</p>
          <ServiceCards items={services?.items} locale={locale} />
        </div>
      </section>

      {/* إحصاءات */}
      <Stats dict={dict} content={stats} />

      {/* لماذا تختارنا */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">{dict.home.whyChooseTitle}</h2>
          <p className="section-subtitle">{isAr ? "نقدم لك مزايا تجعل تجربتك موثوقة وسلسة" : "Advantages that make your experience reliable and smooth"}</p>
          <div className="grid grid-3">
            {whyChoose?.items.map((item, i) => (
              <Card key={i}>
                <div className={styles.featureIcon}>✦</div>
                <h3 className={styles.featureTitle}>{item.title}</h3>
                <p className={styles.featureDesc}>{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* عاملات مميزات */}
      <section className="section" style={{ background: "var(--color-bg-soft)" }}>
        <div className="container">
          <h2 className="section-title">{dict.home.featuredTitle}</h2>
          <p className="section-subtitle">{isAr ? "اختر من بين عاملات موثّقات" : "Choose from verified workers"}</p>
          <div className="grid grid-3">
            {(workers ?? []).map((w, i) => (
              <CandidateCard key={w.id} worker={w} dict={dict} locale={locale} priority={i < 3} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Link href={`/${locale}/candidates`} className={styles.viewAllBtn}>
              {dict.common.showMore} →
            </Link>
          </div>
        </div>
      </section>

      {/* كيف تعمل الخدمة */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">{dict.home.howItWorksTitle}</h2>
          <p className="section-subtitle">{isAr ? "ثلاث خطوات بسيطة" : "Three simple steps"}</p>
          <div className={styles.steps}>
            {howItWorks?.items.map((item) => (
              <div key={item.step} className={styles.step}>
                <div className={styles.stepNum}>{item.step}</div>
                <h3 className={styles.stepTitle}>{item.title}</h3>
                <p className={styles.stepDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* قسم الأسعار */}
      <section className={styles.pricing} id="pricing">
        <div className="container">
          <h2 className={styles.pricingTitle}>{pricing?.title ?? (isAr ? `تبدأ من ${SITE.minSalary} ر.ق / شهرياً` : `Starting from ${SITE.minSalary} QAR / monthly`)}</h2>
          <p className={styles.pricingNote}>{pricing?.note}</p>
          <div className={styles.pricingCtas}>
            <a href={`/${locale}/contact`} className={styles.ctaPrimary}>{pricing?.ctaPrimary ?? dict.nav.freeQuote}</a>
            <Link href={`/${locale}/candidates`} className={styles.ctaSecondary}>{pricing?.ctaSecondary ?? (isAr ? "شاهد الملفات" : "View profiles")}</Link>
          </div>
        </div>
      </section>

      {/* شهادات */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">{dict.home.testimonialsTitle}</h2>
          <p className="section-subtitle">{isAr ? "آراء عملائنا" : "What our clients say"}</p>
          <div className="grid grid-3">
            {testimonials?.items.map((t, i) => (
              <Card key={i}>
                <div className={styles.stars}>{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</div>
                <p className={styles.testimonialText}>&ldquo;{t.text}&rdquo;</p>
                <p className={styles.testimonialName}>— {t.name}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* الأسئلة الشائعة */}
      <section className="section" style={{ background: "var(--color-bg-soft)" }}>
        <div className="container">
          <h2 className="section-title">{dict.home.faqTitle}</h2>
          <p className="section-subtitle">{isAr ? "أكثر الأسئلة شيوعاً" : "Most common questions"}</p>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <Accordion items={faq?.items ?? []} />
          </div>
        </div>
      </section>

      {/* نموذج اطلب عرضاً مجانياً */}
      <section className="section" id="contact">
        <div className="container">
          <h2 className="section-title">{contact?.title ?? dict.home.contactTitle}</h2>
          <p className="section-subtitle">{contact?.subtitle}</p>
          <ContactForm dict={dict} locale={locale} />
        </div>
      </section>
    </div>
  );
}

import { ContactForm } from "@/components/client/ContactForm";
