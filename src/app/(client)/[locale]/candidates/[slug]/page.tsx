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
import { FavoriteButton } from "@/components/client/FavoriteButton";
import styles from "./page.module.css";

export default async function WorkerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const dict = getDictionary(locale);
  const prefix = `/${locale}`;

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

  const returnPolicy = worker.return_policy || SITE.returnPolicy;

  const rows: { label: string; value: string }[] = [
    { label: dict.profile.nationality, value: worker.nationality },
    { label: dict.profile.religion, value: worker.religion || "—" },
    { label: dict.profile.maritalStatus, value: worker.marital_status || "—" },
    { label: dict.profile.children, value: String(worker.children_count) },
    { label: dict.profile.experience, value: `${worker.experience_years} سنة` },
    { label: dict.profile.languages, value: worker.languages.join("، ") },
    { label: dict.profile.expectedSalary, value: formatSalary(worker.expected_salary, locale) },
  ];

  return (
    <div className="container">
      <Breadcrumb locale={locale} items={[{ label: dict.common.candidates, href: "/candidates" }, { label: worker.full_name }]} />

      <div className={styles.header}>
        <img src={worker.photo_url} alt={worker.full_name} className={styles.photo} />
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
          <p className={styles.ref}>المرجع: {worker.slug}</p>
          <p className={styles.salary}>
            {formatSalary(worker.expected_salary, locale)} / {dict.common[worker.employment_type as keyof typeof dict.common] || worker.employment_type}
          </p>
          <div className={styles.actions}>
            <Button href={`${prefix}/book/${worker.slug}`} size="lg">
              {dict.profile.bookThisWorker}
            </Button>
            <Button
              href={whatsappLink(`مرحباً، أرغب في الاستفسار عن المرشحة ${worker.full_name}.`)}
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
          <h3>الشروط الخاصة</h3>
          <p>{worker.terms || "لم تُحدد شروط خاصة لهذه العاملة."}</p>
        </div>
        <div className={styles.termsBlock}>
          <h3>سياسة الاسترجاع</h3>
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
                  <img src={w.photo_url} alt={w.full_name} className={styles.similarImg} />
                  <h3 className={styles.similarName}>{w.full_name}</h3>
                  <p className={styles.similarMeta}>{w.nationality} · {w.experience_years} سنة</p>
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
