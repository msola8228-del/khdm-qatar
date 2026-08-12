import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

const SERVICES: Record<string, { title: string; desc: string; points: string[] }> = {
  "full-time-live-in": {
    title: "إقامة كاملة",
    desc: "خادمة مقيمة بالمنزل على مدار اليوم بكفالة كاملة من الاستقدام حتى انتهاء العقد.",
    points: [
      "استقدام كامل ضمن القانون القطري",
      "كفالة سنوية وتأمين صحي",
      "بديلة خلال فترة التجربة",
      "دعم متواصل بعد الوصول",
    ],
  },
  housemaids: {
    title: "عاملات منزليات",
    desc: "للتنظيف والتدبير المنزلي والاعتناء بالأطفال وكل المهام المنزلية.",
    points: [
      "مهارات تنظيف متخصصة",
      "تجربة موثقة في منازل خليجية",
      "تدريب على استخدام الأجهزة",
      "إتقان مهارات أساسية في رعاية الأطفال",
    ],
  },
  training: {
    title: "تدريب وتأهيل",
    desc: "تأهيل قبل الاستقدام على المهارات المنزلية واللغة والثقافة.",
    points: [
      "تدريب لغوي أساسي",
      "محو أمية الأجهزة المنزلية",
      "تعريف بالثقافة المحلية",
      "تقييم قبل الإرسال",
    ],
  },
  recruitment: {
    title: "توظيف وتعيين",
    desc: "إجراءات كاملة حتى وصول المرشحة إلى منزلك، مع متابعة بعد الوصول.",
    points: [
      "مطابقة الطلب بالمرشح",
      "إنهاء الإجراءات القانونية",
      "تذاكر السفر والاستقبال",
      "متابعة بعد الوصول",
    ],
  },
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const dict = getDictionary(locale);
  const service = SERVICES[slug];
  if (!service) notFound();

  return (
    <div className="container">
      <Breadcrumb locale={locale} items={[{ label: dict.common.services, href: "/services" }, { label: service.title }]} />
      <h1 className={styles.title}>{service.title}</h1>
      <p className={styles.desc}>{service.desc}</p>

      <Card className={styles.points}>
        <h2 className={styles.sectionTitle}>ما الذي يميز خدمتنا</h2>
        <ul className={styles.list}>
          {service.points.map((p, i) => (
            <li key={i}>✓ {p}</li>
          ))}
        </ul>
      </Card>

      <div className={styles.cta}>
        <Button href={`/${locale}/candidates`} size="lg">{dict.nav.browseCandidates}</Button>
        <Button href={`/${locale}/contact`} variant="outline" size="lg">{dict.nav.freeQuote}</Button>
      </div>
    </div>
  );
}
