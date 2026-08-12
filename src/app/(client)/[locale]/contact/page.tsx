import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { ContactForm } from "@/components/client/ContactForm";
import { Card } from "@/components/ui/Card";
import { SITE } from "@/config/site";
import styles from "./page.module.css";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  return (
    <div className="container">
      <Breadcrumb locale={locale} items={[{ label: dict.nav.contact }]} />
      <h1 className={styles.title}>{dict.contact.title}</h1>
      <p className={styles.subtitle}>{dict.contact.subtitle}</p>

      <div className={styles.infoRow}>
        <Card>
          <h3>📍 العنوان</h3>
          <p>{SITE.address}</p>
        </Card>
        <Card>
          <h3>📞 الهاتف</h3>
          <p>{SITE.phone}</p>
        </Card>
        <Card>
          <h3>✉️ البريد</h3>
          <p>{SITE.email}</p>
        </Card>
      </div>

      <h2 className={styles.formTitle}>{dict.contact.formTitle}</h2>
      <ContactForm dict={dict} />
    </div>
  );
}
