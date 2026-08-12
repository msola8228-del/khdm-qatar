import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const { data: row } = await supabase
    .from("page_content")
    .select("content")
    .eq("page", "privacy")
    .eq("section", "body")
    .eq("locale", locale)
    .maybeSingle();

  const content = (row?.content as { html?: string })?.html;

  return (
    <div className="container">
      <Breadcrumb locale={locale} items={[{ label: dict.nav.privacy }]} />
      <h1 className={styles.title}>{dict.privacy.title}</h1>
      <Card className={styles.card}>
        {content ? (
          <div className={styles.content} dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <div className={styles.content}>
            <h2>1. البيانات التي نجمعها</h2>
            <p>نجمع البيانات التي تقدمها طوعاً عبر النماذج (الاسم، الهاتف، البريد)، إضافة إلى بيانات تقنية (IP، بصمة المتصفح) لأغراض الأمان.</p>
            <h2>2. كيف نستخدم بياناتك</h2>
            <p>للتواصل معك بشأن طلبك، ولتحسين خدماتنا، ولمنع الإساءة.</p>
            <h2>3. المشاركة مع الأطراف</h2>
            <p>لا نشارك بياناتك مع أطراف ثالثة لأغراض تسويقية. قد نشاركها مع مقدمي الخدمة (مثل واتساب) لأداء الخدمة فقط.</p>
            <h2>4. التخزين والحماية</h2>
            <p>تُخزن البيانات في قواعد بيانات آمنة مع تشفير النقل، ونطبق ضوابط وصول صارمة.</p>
            <h2>5. حقوقك</h2>
            <p>لك الحق في الوصول لبياناتك وتصحيحها أو حذفها بطلب خطي.</p>
            <h2>6. الكوكيز</h2>
            <p>نستخدم كوكيز أساسية لعمل الموقع وتحسين التجربة.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
