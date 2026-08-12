import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SITE } from "@/config/site";
import { whatsappLink } from "@/lib/whatsapp";
import { formatSalary } from "@/lib/utils";
import { salaryPeriod } from "@/lib/supabase/types";
import { FavoriteButton } from "@/components/client/FavoriteButton";
import { CandidateImage } from "@/components/client/CandidateImage";
import { translateNationality, translateReligion, translateMaritalStatus, translateLanguage, translateList } from "@/lib/translate";
import styles from "./page.module.css";

export default async function WorkerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const dict = getDictionary(locale);
  const prefix = `/${locale}`;
  const isAr = locale === "ar";

  const supabase = createClient();
  const { data: worker } = await supabase
    .from("workers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!worker) notFound();

  const { data: similar } = await supabase
    .from("workers")
    .select("*")
    .eq("nationality", worker.nationality)
    .neq("id", worker.id)
    .limit(3);

  const returnPolicy = worker.return_policy || (isAr ? SITE.returnPolicyAr : SITE.returnPolicyEn);

  const rows: { label: string; value: string }[] = [
    { label: dict.profile.nationality, value: translateNationality(worker.nationality, locale) },
    { label: dict.profile.religion, value: translateReligion(worker.religion || "—", locale) },
    { label: dict.profile.maritalStatus, value: translateMaritalStatus(worker.marital_status || "—", locale) },
    { label: dict.profile.children, value: String(worker.children_count) },
    { label: dict.profile.experience, value: `${worker.experience_years} ${isAr ? "سنة" : "years"}` },
    { label: dict.profile.languages, value: translateList(worker.languages, locale, translateLanguage, isAr ? "، " : ", ") },
    { label: dict.profile.expectedSalary, value: formatSalary(worker.expected_salary, locale) },
  ];

  return (
    <div className="container">
      <Breadcrumb locale={locale} homeLabel={dict.nav.home} items={[{ label: dict.common.candidates, href: "/candidates" }, { label: worker.full_name }]} />

      <div className={styles.header}>
        <div className={styles.photoWrap}>
          <CandidateImage worker={worker} locale={locale as "ar" | "en"} className={styles.photo} />
        </div>
        <div className={styles.info}>
          <div className={styles.badges}>
            {worker.availability === "available" ? (
              <Badge variant="available">{dict.common.available}</Badge>
            ) : (
              <Badge variant="booked">{dict.common.booked}</Badge>
            )}
            <Badge variant="verified">{dict.common.verified}</Badge>
          </div>
          <h1 className={styles.name}>{worker.full_name}</h1>
          <p className={styles.ref}>{isAr ? "المرجع" : "Reference"}: {worker.slug}</p>
          <p className={styles.salary}>
            {formatSalary(worker.expected_salary, locale)}
            {salaryPeriod(worker.employment_type)
              ? ` / ${dict.common[salaryPeriod(worker.employment_type) as keyof typeof dict.common]}`
              : ""}
          </p>
          <div className={styles.actions}>
            <Button href={`${prefix}/book/${worker.slug}`} size="lg">
              {dict.profile.bookThisWorker}
            </Button>
            <Button
              href={whatsappLink(isAr ? `مرحباً، أرغب في الاستفسار عن المرشحة ${worker.full_name}.` : `Hello, I would like to inquire about ${worker.full_name}.`)}
              variant="outline"
              size="lg"
            >
              {dict.common.whatsapp}
            </Button>
            <FavoriteButton workerId={worker.id} label={dict.common.saveFavorite} savedLabel={dict.common.savedFavorite} />
          </div>
        </div>
      </div>

      <Card className={styles.table}>
        <h2 className={styles.sectionTitle}>{dict.profile.personalSkills}</h2>
        <table className={styles.dataTable}>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th>{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className={styles.terms}>
        <h2 className={styles.sectionTitle}>{dict.profile.termsTitle}</h2>
        <div className={styles.termsBlock}>
          <h3>{isAr ? "الشروط الخاصة" : "Special terms"}</h3>
          <p>{isAr ? (worker.terms || "لم تُحدد شروط خاصة لهذه العاملة.") : (worker.terms || "No special terms specified for this worker.")}</p>
        </div>
        <div className={styles.termsBlock}>
          <h3>{isAr ? "سياسة الاسترجاع" : "Return policy"}</h3>
          <p>{returnPolicy}</p>
        </div>
      </Card>

      {similar && similar.length > 0 && (
        <section className="section">
          <h2 className="section-title">{dict.profile.similarTitle}</h2>
          <div className="grid grid-3">
            {similar.map((w) => (
              <Link href={`${prefix}/candidates/${w.slug}`} key={w.id}>
                <Card>
                  <CandidateImage worker={w} locale={locale as "ar" | "en"} className={styles.similarImg} />
                  <h3 className={styles.similarName}>{w.full_name}</h3>
                  <p className={styles.similarMeta}>{translateNationality(w.nationality, locale)} · {w.experience_years} {isAr ? "سنة" : "yrs"}</p>
                  <p className={styles.similarSalary}>{formatSalary(w.expected_salary, locale)}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
