import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { JobLauncherForm } from "@/components/jobs/job-launcher-form";

export const metadata: Metadata = {
  title: "Technický audit | Agency Ops",
};

export default async function TechnicalAuditPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch clients accessible to this user (RLS filtered)
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, slug, domain")
    .eq("is_active", true)
    .order("name");

  const clientOptions =
    clients?.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      domain: c.domain,
    })) ?? [];

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold">Technická SEO analýza</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Kompletní technický audit webu — crawl, analýza a AI doporučení.
      </p>

      <div className="mt-8">
        <JobLauncherForm clients={clientOptions} />
      </div>
    </div>
  );
}
