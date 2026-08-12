import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { Card } from "@/components/ui/Card";
import styles from "./page.module.css";

const SERVICES = [
  {
    slug: "full-time-live-in",
    title: "إقامة كاملة",
    desc: "خادمة مقيمة بالمنزل على مدار اليوم بكفالة كاملة.",
    icon: "🏠",
  },
  {
    slug: "housemaids",
    title: "عاملات منزليات",
    desc: "للتنظيف والتدبير المنزلي والاعتناء بالأطفال.",
    icon: "🧹",
  },
  {
    slug: "training",
    title: "تدريب وتأهيل",
    desc: "تأهيل قبل الاستقدام على المهارات المنزلية واللغة.",
    icon: "📚",
  },
  {
    slug: "recruitment",
    title: "توظيف وتعيين",
    desc: "إجراءات كاملة حتى وصول المرشحة إلى منزلك.",
    icon: "✅",
  },
];

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  return (
    <div className="container">
      <Breadcrumb locale={locale} items={[{ label: dict.common.services }]} />
      <h1 className={styles.title}>خدماتنا</h1>
      <p className={styles.subtitle}>باقة خدمات متكاملة للاستقدام والتوظيف المنزلي في قطر</p>
      <div className="grid grid-2">
        {SERVICES.map((service) => (
          <Link href={`/${locale}/services/${service.slug}`} key={service.slug}>
            <Card className={styles.card}>
              <span className={styles.icon}>{service.icon}</span>
              <h2 className={styles.cardTitle}>{service.title}</h2>
              <p className={styles.cardDesc}>{service.desc}</p>
              <span className={styles.link}>{dict.common.viewDetails} →</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
