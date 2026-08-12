import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function TermsPage({
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
    .eq("page", "terms")
    .eq("section", "body")
    .eq("locale", locale)
    .maybeSingle();

  const content = (row?.content as { html?: string })?.html;

  return (
    <div className="container">
      <Breadcrumb locale={locale} items={[{ label: dict.nav.terms }]} />
      <h1 className={styles.title}>{dict.terms.title}</h1>
      <Card className={styles.card}>
        {content ? (
          <div className={styles.content} dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <div className={styles.content}>
            <h2>1. قبول الشروط</h2>
            <p>باستخدامك لموقعنا فإنك توافق على هذه الشروط والأحكام. يُرجى قراءتها بعناية.</p>
            <h2>2. الخدمات</h2>
            <p>نوفر خدمات الاستقدام والتوظيف المنزلي في قطر وفق الأنظمة والقوانين المعمول بها.</p>
            <h2>3. المسؤوليات</h2>
            <p>يتحمل العميل مسؤولية تقديم معلومات صحيحة، والالتزام بشروط الاستقدام المحلية.</p>
            <h2>4. الرسوم</h2>
            <p>تُطبق الرسوم المعروضة عند توقيع العقد. لا توجد رسوم خفية.</p>
            <h2>5. سياسة الاسترجاع</h2>
            <p>يُسمح باستبدال المرشح خلال فترة التجربة وفق سياسة الاسترجاع المعلنة لكل مرشح.</p>
            <h2>6. الخصوصية</h2>
            <p>نحترم خصوصيتك ونحمي بياناتك وفق سياسة الخصوصية المنشورة.</p>
            <h2>7. التعديلات</h2>
            <p>قد نُحدّث هذه الشروط من حين لآخر، ويسري التعديل فور نشره.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
