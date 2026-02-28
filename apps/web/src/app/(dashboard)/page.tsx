import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ClientCard } from "@/components/clients/client-card";

export const metadata: Metadata = {
  title: "Dashboard | Agency Ops",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user role from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // Fetch clients (RLS filters by membership automatically)
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, slug, domain, is_active")
    .order("name");

  // Count completed jobs per client
  const clientIds = clients?.map((c) => c.id) ?? [];
  let jobCounts: Record<string, number> = {};

  if (clientIds.length > 0) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("client_id")
      .in("client_id", clientIds)
      .eq("status", "completed");

    if (jobs) {
      jobCounts = jobs.reduce<Record<string, number>>((acc, job) => {
        acc[job.client_id] = (acc[job.client_id] ?? 0) + 1;
        return acc;
      }, {});
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {isAdmin && (
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="size-4" />
              Přidat klienta
            </Link>
          </Button>
        )}
      </div>

      {!clients || clients.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-lg bg-surface">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-medium">Žádní klienti</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? "Začněte přidáním prvního klienta."
                : "Zatím vám nebyl přiřazen žádný klient."}
            </p>
          </div>
          {isAdmin && (
            <Button asChild>
              <Link href="/clients/new">
                <Plus className="size-4" />
                Přidat klienta
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              name={client.name}
              slug={client.slug}
              domain={client.domain}
              isActive={client.is_active}
              completedJobs={jobCounts[client.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
