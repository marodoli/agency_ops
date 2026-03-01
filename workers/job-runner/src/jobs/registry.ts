import type { Job, JobType } from "@agency-ops/shared";
import { handleTechnicalAudit } from "./seo/technical-audit/handler.js";

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

// ── Register job handlers ─────────────────────────────────

registerHandler("seo.technical-audit", handleTechnicalAudit);
