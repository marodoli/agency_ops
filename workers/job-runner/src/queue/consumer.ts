import pino from "pino";
import type { Job, JobError } from "@agency-ops/shared";
import { supabase } from "../lib/supabase";

const logger = pino({ name: "queue-consumer" });

// DB row shape returned by claim_next_job RPC and Supabase queries
type DbJobRow = {
  id: string;
  client_id: string;
  job_type: string;
  status: string;
  params: Record<string, unknown>;
  progress: number;
  progress_message: string | null;
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  timeout_at: string | null;
  created_at: string;
  created_by: string;
};

/**
 * Atomically claim the next queued job using FOR UPDATE SKIP LOCKED.
 * Returns null if no jobs are queued.
 */
export async function pollForJob(): Promise<Job | null> {
  const { data, error } = await supabase.rpc("claim_next_job");

  if (error) {
    logger.error({ error }, "Failed to poll for job");
    return null;
  }

  const rows = data as DbJobRow[] | null;
  if (!rows || rows.length === 0) {
    return null;
  }

  const row = rows[0];
  if (!row) return null;

  logger.info({ jobId: row.id, type: row.job_type }, "Job claimed from queue");
  return row as unknown as Job;
}

/**
 * Update job progress and optional status message.
 */
export async function updateProgress(
  jobId: string,
  progress: number,
  message: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .update({
      progress,
      progress_message: message,
    })
    .eq("id", jobId);

  if (error) {
    logger.error({ jobId, error }, "Failed to update progress");
  }
}

/**
 * Mark job as completed with result data.
 */
export async function completeJob(
  jobId: string,
  result: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "completed",
      progress: 100,
      progress_message: "Dokončeno",
      result,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    logger.error({ jobId, error }, "Failed to complete job");
  }
}

/**
 * Handle job failure. If retries remain, re-queue the job.
 * Otherwise, mark as permanently failed.
 *
 * Returns "requeued" if the job will be retried, "failed" if permanently failed.
 */
export async function failJob(
  jobId: string,
  jobError: JobError,
  retryCount: number,
  maxRetries: number,
): Promise<"failed" | "requeued"> {
  if (retryCount < maxRetries) {
    const { error } = await supabase
      .from("jobs")
      .update({
        status: "queued",
        progress: 0,
        progress_message: `Retry ${retryCount + 1}/${maxRetries}`,
        error: jobError,
        retry_count: retryCount + 1,
        started_at: null,
      })
      .eq("id", jobId);

    if (error) {
      logger.error({ jobId, error }, "Failed to requeue job for retry");
    }

    return "requeued";
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      status: "failed",
      progress_message: "Selhalo po maximálním počtu pokusů",
      error: jobError,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    logger.error({ jobId, error }, "Failed to mark job as failed");
  }

  return "failed";
}
