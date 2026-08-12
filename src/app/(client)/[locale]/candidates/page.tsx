import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { CandidatesPageClient } from "@/components/client/CandidatesPageClient";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default async function CandidatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  const supabase = createClient();
  const { data } = await supabase
    .from("workers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CandidatesPageClient dict={dict} locale={locale} initial={data ?? []} />
    </Suspense>
  );
}
