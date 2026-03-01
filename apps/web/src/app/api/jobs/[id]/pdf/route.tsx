import { type NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";

import { TechnicalAuditResultSchema } from "@agency-ops/shared";
import { createClient } from "@/lib/supabase/server";
import { parseIssueScores, parseAiRecommendations } from "@/lib/seo-utils";
import { registerFonts } from "@/lib/pdf/fonts";
import { SeoReportPdf } from "@/lib/pdf/seo-report-pdf";

export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  // 1. Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  // 2. Fetch job (RLS ensures access)
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, client_id, status, result, completed_at, params")
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: { message: "Job not found", code: "NOT_FOUND" } },
      { status: 404 },
    );
  }

  // 3. Validate status
  if (job.status !== "completed" || !job.result) {
    return NextResponse.json(
      { error: { message: "Report not available", code: "NOT_READY" } },
      { status: 409 },
    );
  }

  // 4. Parse result
  const parsed = TechnicalAuditResultSchema.safeParse(job.result);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Invalid report data", code: "PARSE_ERROR" } },
      { status: 500 },
    );
  }
  const result = parsed.data;

  // 5. Fetch client name
  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", job.client_id)
    .single();
  const clientName = client?.name ?? "N/A";

  // 6. Derive domain
  const params = job.params as Record<string, unknown>;
  let domain = typeof params?.domain === "string" ? params.domain : "";
  if (!domain && result.pages[0]?.url) {
    try {
      domain = new URL(result.pages[0].url).hostname;
    } catch {
      domain = "unknown";
    }
  }

  // 7. Parse AI data
  const scoredIssues = parseIssueScores(result.ai_recommendations);
  const parsedRecommendations = parseAiRecommendations(
    result.ai_recommendations,
  );

  // 8. Render PDF
  registerFonts();

  const stream = await renderToStream(
    <SeoReportPdf
      result={result}
      clientName={clientName}
      domain={domain}
      completedAt={job.completed_at ?? new Date().toISOString()}
      scoredIssues={scoredIssues}
      parsedRecommendations={parsedRecommendations}
    />,
  );

  // 9. Build response
  const dateStr = job.completed_at
    ? new Date(job.completed_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const safeDomain = domain.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `seo-audit-${safeDomain}-${dateStr}.pdf`;

  // Convert Node ReadableStream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err: Error) => controller.error(err));
    },
  });

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
