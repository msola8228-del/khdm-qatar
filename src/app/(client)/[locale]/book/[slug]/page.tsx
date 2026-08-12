import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { SITE } from "@/config/site";
import { formatSalary } from "@/lib/utils";
import { BookingForm } from "@/components/client/BookingForm";
import styles from "./page.module.css";

export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const { data: worker } = await supabase
    .from("workers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!worker) notFound();

  const returnPolicy = worker.return_policy || SITE.returnPolicy;

  return (
    <div className="container">
      <Breadcrumb
        locale={locale}
        items={[
          { label: dict.common.candidates, href: "/candidates" },
          { label: worker.full_name, href: `/candidates/${worker.slug}` },
          { label: dict.common.book },
        ]}
      />

      <h1 className={styles.title}>{dict.book.title}</h1>

      <div className={styles.summary}>
        <img src={worker.photo_url} alt={worker.full_name} className={styles.photo} />
        <div>
          <h2 className={styles.workerName}>{worker.full_name}</h2>
          <p className={styles.workerRef}>{worker.slug}</p>
          <p className={styles.workerSalary}>
            {formatSalary(worker.expected_salary, locale)} /{" "}
            {dict.common[worker.employment_type as keyof typeof dict.common] || worker.employment_type}
          </p>
        </div>
      </div>

      <div className={styles.terms}>
        <h3>الشروط الخاصة</h3>
        <p>{worker.terms || "لم تُحدد شروط خاصة لهذه العاملة."}</p>
        <h3>سياسة الاسترجاع</h3>
        <p>{returnPolicy}</p>
      </div>

      <BookingForm worker={worker} dict={dict} locale={locale} />
    </div>
  );
}
