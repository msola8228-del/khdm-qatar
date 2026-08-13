import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { SITE } from "@/config/site";
import { formatWorkerPrice } from "@/lib/pricing";
import { BookingForm } from "@/components/client/BookingForm";
import { CandidateImage } from "@/components/client/CandidateImage";
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

  const isAr = locale === "ar";
  const returnPolicy = worker.return_policy || (isAr ? SITE.returnPolicyAr : SITE.returnPolicyEn);

  return (
    <div className="container">
      <Breadcrumb
        locale={locale}
        homeLabel={dict.nav.home}
        items={[
          { label: dict.common.candidates, href: "/candidates" },
          { label: worker.full_name, href: `/candidates/${worker.slug}` },
          { label: dict.common.book },
        ]}
      />

      <h1 className={styles.title}>{dict.book.title}</h1>

      <div className={styles.summary}>
        <CandidateImage worker={worker} locale={locale as "ar" | "en"} className={styles.photo} />
        <div>
          <h2 className={styles.workerName}>{worker.full_name}</h2>
          <p className={styles.workerRef}>{worker.slug}</p>
          <p className={styles.workerSalary}>
            {formatWorkerPrice(worker, locale)}
          </p>
        </div>
      </div>

      <div className={styles.terms}>
        <h3>{isAr ? "الشروط الخاصة" : "Special terms"}</h3>
        <p>{worker.terms || (isAr ? "لم تُحدد شروط خاصة لهذه العاملة." : "No special terms specified for this worker.")}</p>
        <h3>{isAr ? "سياسة الاسترجاع" : "Return policy"}</h3>
        <p>{returnPolicy}</p>
      </div>

      <BookingForm worker={worker} dict={dict} locale={locale} />
    </div>
  );
}
