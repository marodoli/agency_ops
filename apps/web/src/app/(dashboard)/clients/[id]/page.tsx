import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientDetailTabs } from "./client-detail-tabs";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("slug", id)
    .single();

  return {
    title: client ? `${client.name} | Agency Ops` : "Klient | Agency Ops",
  };
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id: slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // Fetch client by slug (RLS filters by membership)
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!client) notFound();

  // Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // Fetch team members
  const { data: memberRows } = await supabase
    .from("client_members")
    .select("user_id, role")
    .eq("client_id", client.id);

  const memberUserIds = memberRows?.map((m) => m.user_id) ?? [];
  let members: { userId: string; fullName: string | null; role: string }[] = [];

  if (memberUserIds.length > 0) {
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", memberUserIds);

    members = (memberRows ?? []).map((m) => ({
      userId: m.user_id,
      fullName:
        memberProfiles?.find((p) => p.id === m.user_id)?.full_name ?? null,
      role: m.role,
    }));
  }

  // Fetch jobs for this client
  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, job_type, status, progress, created_at, completed_at",
    )
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const clientData = {
    id: client.id,
    name: client.name,
    slug: client.slug,
    domain: client.domain,
    brandVoice: client.brand_voice,
    notes: client.notes,
    isActive: client.is_active,
    createdAt: client.created_at,
    updatedAt: client.updated_at,
  };

  const jobsData = (jobs ?? []).map((j) => ({
    id: j.id,
    jobType: j.job_type,
    status: j.status,
    progress: j.progress,
    createdAt: j.created_at,
    completedAt: j.completed_at,
  }));

  return (
    <div>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Zpět na dashboard
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          {client.domain && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe className="size-3.5" />
              <a
                href={`https://${client.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground hover:underline"
              >
                {client.domain}
              </a>
            </p>
          )}
        </div>
        <Badge variant={client.is_active ? "default" : "secondary"}>
          {client.is_active ? "Aktivní" : "Neaktivní"}
        </Badge>
      </div>

      <ClientDetailTabs
        client={clientData}
        members={members}
        jobs={jobsData}
        isAdmin={isAdmin}
      />
    </div>
  );
}
