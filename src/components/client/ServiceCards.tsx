import Link from "next/link";
import { Card } from "@/components/ui/Card";
import styles from "./ServiceCards.module.css";

const DEFAULT_SERVICES = [
  { title: "إقامة كاملة", desc: "خادمة مقيمة بالمنزل على مدار اليوم.", slug: "full-time-live-in" },
  { title: "عاملات منزليات", desc: "للتنظيف والتدبير المنزلي.", slug: "housemaids" },
  { title: "تدريب", desc: "تأهيل قبل الاستقدام.", slug: "training" },
  { title: "توظيف وتعيين", desc: "إجراءات كاملة حتى الوصول.", slug: "recruitment" },
];

export function ServiceCards({ items }: { items?: { title: string; desc: string }[] }) {
  const services = items ?? DEFAULT_SERVICES;
  return (
    <div className="grid grid-4">
      {services.map((service, i) => {
        const slug = DEFAULT_SERVICES[i]?.slug ?? "";
        return (
          <Link href={`/ar/services/${slug}`} key={i}>
            <Card className={styles.card}>
              <div className={styles.icon}>✦</div>
              <h3 className={styles.title}>{service.title}</h3>
              <p className={styles.desc}>{service.desc}</p>
              <span className={styles.link}>التفاصيل →</span>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
