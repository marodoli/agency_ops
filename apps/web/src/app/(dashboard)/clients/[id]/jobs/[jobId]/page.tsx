import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { TechnicalAuditResultSchema } from "@agency-ops/shared";
import { createClient } from "@/lib/supabase/server";
import { JobProgressCard } from "@/components/jobs/job-progress-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ReportHeader } from "@/components/seo/report-header";
import { ScoreCards } from "@/components/seo/score-cards";
import { ReportTabs } from "@/components/seo/report-tabs";
import { parseIssueScores } from "@/lib/seo-utils";

type RouteParams = { params: Promise<{ id: string; jobId: string }> };

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { id } = await params;
  return { title: `Stav jobu – ${id} | Agency Ops` };
}

export default async function JobStatusPage({ params }: RouteParams) {
  const { id: slug, jobId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch client by slug to get context
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!client) notFound();

  // Fetch job detail (RLS ensures access)
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, client_id, job_type, status, progress, progress_message, result, error, retry_count, started_at, completed_at, timeout_at, created_at",
    )
    .eq("id", jobId)
    .eq("client_id", client.id)
    .single();

  if (!job) notFound();

  const jobError = job.error as { message: string; code?: string } | null;

  // Parse report for completed jobs
  const reportParse = job.status === "completed" && job.result
    ? TechnicalAuditResultSchema.safeParse(job.result)
    : null;
  const report = reportParse?.success ? reportParse.data : null;

  return (
    <div className={`mx-auto ${report ? "max-w-5xl" : "max-w-xl"}`}>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 mb-4 text-muted-foreground"
      >
        <Link href={`/clients/${slug}`}>
          <ArrowLeft className="size-4" />
          {client.name}
        </Link>
      </Button>

      <JobProgressCard
        jobId={job.id}
        jobType={job.job_type}
        initialStatus={job.status}
        initialProgress={job.progress}
        initialMessage={job.progress_message}
        startedAt={job.started_at}
        completedAt={job.completed_at}
        error={jobError}
        clientSlug={slug}
      />

      {report && job.completed_at && (
        <>
          <Separator className="my-8" />

          <div className="space-y-8">
            <ReportHeader
              domain={
                report.pages[0]?.url
                  ? new URL(report.pages[0].url).hostname
                  : "N/A"
              }
              clientName={client.name}
              completedAt={job.completed_at}
              durationMs={report.summary.crawl_duration_ms}
              totalPagesCrawled={report.summary.total_pages_crawled}
            />

            <ScoreCards summary={report.summary} />

            <ReportTabs
              categories={report.categories}
              pages={report.pages}
              aiRecommendations={report.ai_recommendations}
              scoredIssues={parseIssueScores(report.ai_recommendations)}
              summary={report.summary}
            />
          </div>
        </>
      )}
    </div>
  );
}
