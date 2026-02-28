import { z } from "zod";

// ── Job status & type enums ────────────────────────────────

export const JobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobTypeSchema = z.enum([
  "seo.technical-audit",
  "seo.keyword-analysis",
]);

export type JobType = z.infer<typeof JobTypeSchema>;

// ── Job params ─────────────────────────────────────────────

export const TechnicalAuditParamsSchema = z.object({
  domain: z.string().min(1),
  crawl_depth: z.number().int().min(1).max(5).default(3),
  max_pages: z.number().int().min(10).max(500).default(100),
  custom_instructions: z.string().optional(),
});

export type TechnicalAuditParams = z.infer<typeof TechnicalAuditParamsSchema>;

export const KeywordAnalysisParamsSchema = z.object({
  // TBD – MVP 1.2
});

export type KeywordAnalysisParams = z.infer<typeof KeywordAnalysisParamsSchema>;

export const JobParamsSchema = z.union([
  TechnicalAuditParamsSchema,
  KeywordAnalysisParamsSchema,
]);

export type JobParams = z.infer<typeof JobParamsSchema>;

// ── Job error ──────────────────────────────────────────────

export const JobErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  stack: z.string().optional(),
});

export type JobError = z.infer<typeof JobErrorSchema>;

// ── jobs table ─────────────────────────────────────────────

export const JobSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  job_type: JobTypeSchema,
  status: JobStatusSchema,
  params: z.record(z.unknown()),
  progress: z.number().int().min(0).max(100),
  progress_message: z.string().nullable(),
  result: z.record(z.unknown()).nullable(),
  error: JobErrorSchema.nullable(),
  retry_count: z.number().int().min(0),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  timeout_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  created_by: z.string().uuid(),
});

export type Job = z.infer<typeof JobSchema>;

// ── Job creation payload (API) ─────────────────────────────

export const CreateJobSchema = z.object({
  client_id: z.string().uuid(),
  job_type: JobTypeSchema,
  params: z.record(z.unknown()),
});

export type CreateJob = z.infer<typeof CreateJobSchema>;
