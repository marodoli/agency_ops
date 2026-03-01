import type { Job, JobType } from "@agency-ops/shared";

export type ProgressFn = (
  progress: number,
  message: string | null,
) => Promise<void>;

export type JobHandler = (
  job: Job,
  updateProgress: ProgressFn,
) => Promise<Record<string, unknown>>;

const handlers = new Map<string, JobHandler>();

export function registerHandler(jobType: string, handler: JobHandler): void {
  handlers.set(jobType, handler);
}

export function getHandler(jobType: JobType): JobHandler | undefined {
  return handlers.get(jobType);
}

// ── Placeholder handlers ───────────────────────────────────

registerHandler("seo.technical-audit", async (_job, updateProgress) => {
  // Will be replaced with actual crawler + analyzers + AI compilation
  await updateProgress(5, "Příprava auditu...");
  await updateProgress(50, "Crawling...");
  await updateProgress(80, "Analýza dat...");
  await updateProgress(95, "Generování reportu...");

  return {
    summary: {
      total_pages_crawled: 0,
      total_issues: 0,
      critical_count: 0,
      warning_count: 0,
      info_count: 0,
      overall_score: 0,
      crawl_duration_ms: 0,
    },
    categories: {},
    pages: [],
    ai_recommendations: "Placeholder — handler not yet implemented.",
  };
});
