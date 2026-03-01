import pino from "pino";
import type {
  Job,
  Issue,
  TechnicalAuditResult,
  CategoryResult,
  PageResult,
  CrawledPage,
} from "@agency-ops/shared";
import { TechnicalAuditParamsSchema } from "@agency-ops/shared";
import type { ProgressFn } from "../../registry";
import { crawl } from "./crawler";
import type { CrawlResult } from "./crawler";
import { selectUrlsForPageSpeed, runPageSpeed } from "./pagespeed";
import type { PageSpeedResult } from "./pagespeed";
import { analyzeIndexability } from "./analyzers/indexability";
import { analyzeOnPage } from "./analyzers/on-page";
import { analyzeSecurity } from "./analyzers/security";
import { analyzeArchitecture } from "./analyzers/architecture";
import { analyzeStructuredData } from "./analyzers/structured-data";
import { analyzePerformance } from "./analyzers/performance";
import { analyzeAeoGeo } from "./analyzers/aeo-geo";
import { analyzeInternational } from "./analyzers/international";
import { generateSeoReport } from "../../../lib/ai";
import type { AiReport } from "../../../lib/ai";

const logger = pino({ name: "seo-technical-audit" });

// ── Main handler ─────────────────────────────────────────────

export async function handleTechnicalAudit(
  job: Job,
  updateProgress: ProgressFn,
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  // ═══════════════════════════════════════════════════════════
  //  STEP 1: PREPARATION (0 → 5%)
  // ═══════════════════════════════════════════════════════════

  await updateProgress(0, "Příprava auditu...");

  const params = TechnicalAuditParamsSchema.parse(job.params);
  const { domain, crawl_depth, max_pages, custom_instructions } = params;

  logger.info(
    { jobId: job.id, domain, crawl_depth, max_pages },
    "Starting technical audit",
  );

  await updateProgress(5, "Zahajuji crawling...");

  // ═══════════════════════════════════════════════════════════
  //  STEP 2: CRAWL (5 → 50%)
  // ═══════════════════════════════════════════════════════════

  let crawlResult: CrawlResult;
  try {
    crawlResult = await crawl({
      domain,
      maxDepth: crawl_depth,
      maxPages: max_pages,
      progressCallback: async (crawled, total) => {
        // Map crawl progress to 5-50% range
        const pct = Math.round(5 + (crawled / Math.max(total, 1)) * 45);
        await updateProgress(
          Math.min(pct, 50),
          `Crawling... ${crawled}/${total} stránek`,
        );
      },
    });

    logger.info(
      {
        pages: crawlResult.pages.length,
        sitemapUrls: crawlResult.sitemapUrls.length,
        baseUrl: crawlResult.baseUrl,
      },
      "Crawl complete",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: msg }, "Crawl failed — aborting job");
    throw new Error(`Crawl selhal: ${msg}`);
  }

  if (crawlResult.pages.length === 0) {
    throw new Error(
      "Crawl nevrátil žádné stránky. Zkontrolujte doménu a robots.txt.",
    );
  }

  await updateProgress(50, "Měřím rychlost stránek (PageSpeed)...");

  // ═══════════════════════════════════════════════════════════
  //  STEP 3: PAGESPEED (50 → 60%)
  // ═══════════════════════════════════════════════════════════

  let pageSpeedResults: PageSpeedResult[] = [];
  try {
    const psiUrls = selectUrlsForPageSpeed(crawlResult.pages, 5);

    if (psiUrls.length > 0) {
      pageSpeedResults = await runPageSpeed({
        urls: psiUrls,
        progressCallback: async (done, total) => {
          const pct = Math.round(50 + (done / Math.max(total, 1)) * 10);
          await updateProgress(
            Math.min(pct, 60),
            `PageSpeed... ${done}/${total} měření`,
          );
        },
      });
    }

    logger.info(
      { results: pageSpeedResults.length },
      "PageSpeed analysis complete",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      { error: msg },
      "PageSpeed failed — continuing without performance data",
    );
    // Degraded mode: continue without PSI data
  }

  await updateProgress(60, "Analyzuji data...");

  // ═══════════════════════════════════════════════════════════
  //  STEP 4: ANALYSIS (60 → 80%)
  // ═══════════════════════════════════════════════════════════

  const analyzerInput = {
    pages: crawlResult.pages,
    robotsTxt: crawlResult.robotsTxt,
    sitemapUrls: crawlResult.sitemapUrls,
    pageSpeedResults,
  };

  const [
    indexabilityIssues,
    onPageIssues,
    securityIssues,
    architectureIssues,
    structuredDataIssues,
    performanceIssues,
    aeoGeoIssues,
    internationalIssues,
  ] = await Promise.all([
    analyzeIndexability(analyzerInput),
    analyzeOnPage(analyzerInput),
    analyzeSecurity(analyzerInput),
    analyzeArchitecture(analyzerInput),
    analyzeStructuredData(analyzerInput),
    analyzePerformance(analyzerInput),
    analyzeAeoGeo(analyzerInput),
    analyzeInternational(analyzerInput),
  ]);

  const allIssues: Issue[] = [
    ...indexabilityIssues,
    ...onPageIssues,
    ...securityIssues,
    ...architectureIssues,
    ...structuredDataIssues,
    ...performanceIssues,
    ...aeoGeoIssues,
    ...internationalIssues,
  ];

  logger.info(
    {
      total: allIssues.length,
      critical: allIssues.filter((i) => i.severity === "critical").length,
      warning: allIssues.filter((i) => i.severity === "warning").length,
      info: allIssues.filter((i) => i.severity === "info").length,
    },
    "Analysis complete",
  );

  await updateProgress(80, "Generuji AI report...");

  // ═══════════════════════════════════════════════════════════
  //  STEP 5: AI COMPILATION (80 → 95%)
  // ═══════════════════════════════════════════════════════════

  const crawlDurationMs = Date.now() - startTime;
  let aiReport: AiReport | null = null;

  try {
    aiReport = await generateSeoReport({
      issues: allIssues,
      crawlStats: {
        totalPagesCrawled: crawlResult.pages.length,
        domain,
        crawlDepthUsed: crawl_depth,
        crawlDurationMs,
      },
      customInstructions: custom_instructions,
    });

    if (aiReport) {
      logger.info(
        { scoredIssues: aiReport.scored_issues.length },
        "AI report generated",
      );
    } else {
      logger.warn("AI report returned null — proceeding without AI summary");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      { error: msg },
      "AI compilation failed — continuing without AI summary",
    );
    // Degraded mode: continue without AI
  }

  await updateProgress(95, "Sestavuji finální report...");

  // ═══════════════════════════════════════════════════════════
  //  STEP 6: REPORT ASSEMBLY (95 → 100%)
  // ═══════════════════════════════════════════════════════════

  const totalDurationMs = Date.now() - startTime;

  const categories = buildCategories({
    indexabilityIssues,
    onPageIssues,
    securityIssues,
    architectureIssues,
    structuredDataIssues,
    performanceIssues,
    aeoGeoIssues,
    internationalIssues,
  });

  const pages = buildPageResults(crawlResult.pages, allIssues);

  const result: TechnicalAuditResult = {
    summary: {
      total_pages_crawled: crawlResult.pages.length,
      total_issues: allIssues.length,
      critical_count: allIssues.filter((i) => i.severity === "critical").length,
      warning_count: allIssues.filter((i) => i.severity === "warning").length,
      info_count: allIssues.filter((i) => i.severity === "info").length,
      overall_score: calculateOverallScore(allIssues, crawlResult.pages.length),
      crawl_duration_ms: totalDurationMs,
    },
    categories,
    pages,
    ai_recommendations: buildAiRecommendationsText(aiReport),
  };

  logger.info(
    {
      jobId: job.id,
      score: result.summary.overall_score,
      totalIssues: result.summary.total_issues,
      durationMs: totalDurationMs,
    },
    "Technical audit complete",
  );

  return result as unknown as Record<string, unknown>;
}

// ── Build category results ───────────────────────────────────

function buildCategories(issueGroups: {
  indexabilityIssues: Issue[];
  onPageIssues: Issue[];
  securityIssues: Issue[];
  architectureIssues: Issue[];
  structuredDataIssues: Issue[];
  performanceIssues: Issue[];
  aeoGeoIssues: Issue[];
  internationalIssues: Issue[];
}): TechnicalAuditResult["categories"] {
  return {
    indexability: toCategoryResult(issueGroups.indexabilityIssues),
    meta_tags: toCategoryResult(issueGroups.onPageIssues),
    security: toCategoryResult(issueGroups.securityIssues),
    internal_linking: toCategoryResult(issueGroups.architectureIssues),
    structured_data: toCategoryResult(issueGroups.structuredDataIssues),
    performance: toCategoryResult(issueGroups.performanceIssues),
    core_web_vitals: toCategoryResult(
      issueGroups.performanceIssues.filter(
        (i) =>
          i.title.includes("LCP") ||
          i.title.includes("INP") ||
          i.title.includes("CLS") ||
          i.title.includes("TTFB"),
      ),
    ),
    sitemap_robots: toCategoryResult(
      issueGroups.indexabilityIssues.filter(
        (i) =>
          i.title.toLowerCase().includes("sitemap") ||
          i.title.toLowerCase().includes("robots"),
      ),
    ),
    redirects: toCategoryResult(
      issueGroups.securityIssues.filter(
        (i) =>
          i.title.toLowerCase().includes("přesměrování") ||
          i.title.toLowerCase().includes("redirect") ||
          i.title.includes("302") ||
          i.title.includes("301"),
      ),
    ),
    broken_links: toCategoryResult([]),
    mobile_friendliness: toCategoryResult(
      issueGroups.internationalIssues.length > 0
        ? issueGroups.internationalIssues
        : issueGroups.aeoGeoIssues,
    ),
  };
}

function toCategoryResult(issues: Issue[]): CategoryResult {
  return {
    score: calculateCategoryScore(issues),
    issues,
  };
}

// ── Score calculation ────────────────────────────────────────

function calculateCategoryScore(issues: Issue[]): number {
  if (issues.length === 0) return 100;

  let penalty = 0;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical":
        penalty += 15;
        break;
      case "warning":
        penalty += 5;
        break;
      case "info":
        penalty += 1;
        break;
    }
  }

  return Math.max(0, Math.min(100, 100 - penalty));
}

function calculateOverallScore(issues: Issue[], totalPages: number): number {
  if (totalPages === 0) return 0;

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  // Weighted penalty: critical issues weigh more
  const penalty =
    criticalCount * 10 + warningCount * 3 + infoCount * 0.5;

  // Scale penalty relative to site size (more pages = issues are expected)
  const scaleFactor = Math.max(1, Math.log10(totalPages + 1));
  const scaledPenalty = penalty / scaleFactor;

  return Math.max(0, Math.min(100, Math.round(100 - scaledPenalty)));
}

// ── Build page results ───────────────────────────────────────

function buildPageResults(
  pages: CrawledPage[],
  allIssues: Issue[],
): PageResult[] {
  // Build lookup: URL → issues affecting that URL
  const issuesByUrl = new Map<string, Issue[]>();
  for (const issue of allIssues) {
    for (const url of issue.affected_urls) {
      const existing = issuesByUrl.get(url);
      if (existing) {
        existing.push(issue);
      } else {
        issuesByUrl.set(url, [issue]);
      }
    }
  }

  // Only include 200 OK pages in the page results
  return pages
    .filter((p) => p.statusCode === 200)
    .slice(0, 100) // Limit to prevent oversized results
    .map((p): PageResult => ({
      url: p.finalUrl,
      status_code: p.statusCode,
      title: p.title ?? "",
      meta_description: p.metaDescription ?? "",
      h1: p.h1,
      load_time_ms: p.responseTimeMs,
      content_length: p.contentLength,
      issues: issuesByUrl.get(p.finalUrl) ?? [],
    }));
}

// ── AI recommendations text ──────────────────────────────────

function buildAiRecommendationsText(aiReport: AiReport | null): string {
  if (!aiReport) {
    return "AI analýza nebyla k dispozici. Report obsahuje pouze automaticky detekované issues.";
  }

  const parts: string[] = [];

  // Executive summary
  parts.push("## Executive Summary");
  parts.push(aiReport.executive_summary);

  // Action plan
  parts.push("\n## Akční plán");

  if (aiReport.action_plan.sprint_1.length > 0) {
    parts.push("\n### Sprint 1 (Quick Wins + Top Critical)");
    for (const action of aiReport.action_plan.sprint_1) {
      parts.push(`- ${action}`);
    }
  }

  if (aiReport.action_plan.sprint_2.length > 0) {
    parts.push("\n### Sprint 2");
    for (const action of aiReport.action_plan.sprint_2) {
      parts.push(`- ${action}`);
    }
  }

  if (aiReport.action_plan.backlog.length > 0) {
    parts.push("\n### Backlog");
    for (const action of aiReport.action_plan.backlog) {
      parts.push(`- ${action}`);
    }
  }

  // Scored issues summary
  parts.push("\n## Hodnocení issues (Impact × Effort)");
  const sorted = [...aiReport.scored_issues].sort(
    (a, b) => b.impact - a.impact || a.effort - b.effort,
  );
  for (const si of sorted) {
    const quadrantLabel = {
      quick_win: "Quick Win",
      major_project: "Major Project",
      fill_in: "Fill-in",
      time_waster: "Time Waster",
    }[si.quadrant];
    parts.push(
      `- **${si.title}** [${si.severity.toUpperCase()}] — Impact: ${si.impact}/5, Effort: ${si.effort}/5 → ${quadrantLabel}`,
    );
  }

  // Full recommendations
  parts.push("\n## Doporučení");
  parts.push(aiReport.recommendations_text);

  return parts.join("\n");
}
