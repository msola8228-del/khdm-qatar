import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { SITE } from "@/config/site";
import styles from "./page.module.css";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  return (
    <div className="container">
      <Breadcrumb locale={locale} items={[{ label: dict.nav.about }]} />
      <h1 className={styles.title}>{dict.about.title}</h1>
      <p className={styles.lead}>{dict.about.lead}</p>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{SITE.yearsExperience}+</span>
          <span className={styles.statLabel}>سنوات خبرة</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{SITE.familiesCount}+</span>
          <span className={styles.statLabel}>عائلة سعيدة</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{SITE.workersCount}+</span>
          <span className={styles.statLabel}>مرشح موثّق</span>
        </div>
      </div>

      <div className={styles.values}>
        <Card>
          <h3>🎯 رؤيتنا</h3>
          <p>أن نكون المكتب الأول في قطر للاستقدام المنزلي الموثوق.</p>
        </Card>
        <Card>
          <h3>🤝 رسالتنا</h3>
          <p>ربط الأسر بمرشحين مؤهلين بشفافية كاملة واحترام لكرامة العامل.</p>
        </Card>
        <Card>
          <h3>⭐ قيمنا</h3>
          <p>الشفافية، الاحترام، الجودة، الالتزام بالقانون.</p>
        </Card>
      </div>

      <h2 className={styles.sectionTitle}>معلومات عن المكتب</h2>
      <div className={styles.info}>
        <p><strong>الاسم:</strong> {SITE.nameAr}</p>
        <p><strong>الوصف:</strong> {SITE.taglineAr}</p>
        <p><strong>السجل التجاري:</strong> {SITE.commercialRegistration}</p>
        <p><strong>العنوان:</strong> {SITE.address}</p>
        <p><strong>الهاتف:</strong> {SITE.phone}</p>
        <p><strong>البريد:</strong> {SITE.email}</p>
      </div>
    </div>
  );
}
