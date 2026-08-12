import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { Breadcrumb } from "@/components/client/Breadcrumb";
import { CandidateCard } from "@/components/client/CandidateCard";
import styles from "./page.module.css";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; nationality: string }>;
}) {
  const { locale, nationality } = await params;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const { data: workers } = await supabase
    .from("workers")
    .select("*")
    .eq("nationality", nationality)
    .order("created_at", { ascending: false });

  return (
    <div className="container">
      <Breadcrumb locale={locale} items={[{ label: dict.common.candidates, href: "/candidates" }, { label: nationality }]} />
      <h1 className={styles.title}>{nationality}</h1>
      <p className={styles.count}>
        {workers?.length ?? 0} {dict.common.candidate}
      </p>
      <div className="grid grid-3">
        {(workers ?? []).map((w) => (
          <CandidateCard key={w.id} worker={w} dict={dict} locale={locale} />
        ))}
      </div>
    </div>
  );
}
