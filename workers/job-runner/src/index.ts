import pino from "pino";
import type { JobType } from "@agency-ops/shared";
import { JOB_TYPE_REGISTRY } from "@agency-ops/shared";
import { supabase } from "./lib/supabase";
import * as consumer from "./queue/consumer";
import { getHandler } from "./jobs/registry";

const logger = pino({ name: "job-runner" });

const POLL_INTERVAL_MS = parseInt(
  process.env.JOB_POLL_INTERVAL_MS ?? "5000",
  10,
);

let shuttingDown = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeAuditLog(
  userId: string,
  clientId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    user_id: userId,
    client_id: clientId,
    action,
    metadata,
  });

  if (error) {
    logger.error({ error, action }, "Failed to write audit log");
  }
}

async function processJob(): Promise<void> {
  const job = await consumer.pollForJob();
  if (!job) return;

  const jobType = job.job_type as JobType;
  logger.info({ jobId: job.id, type: jobType, retry: job.retry_count }, "Processing job");

  // ── Resolve handler ──────────────────────────────────────
  const handler = getHandler(jobType);
  if (!handler) {
    logger.error({ jobType }, "No handler registered for job type");
    await consumer.failJob(
      job.id,
      { message: `No handler for job type: ${jobType}` },
      job.retry_count,
      0, // no retries for missing handler
    );
    return;
  }

  const config = JOB_TYPE_REGISTRY[jobType];
  const maxRetries = config.maxRetries;

  // ── Timeout pre-check ────────────────────────────────────
  if (job.timeout_at && new Date(job.timeout_at) <= new Date()) {
    logger.warn({ jobId: job.id }, "Job already past timeout");
    await consumer.failJob(
      job.id,
      { message: "Job timed out before processing started", code: "TIMEOUT" },
      job.retry_count,
      maxRetries,
    );
    return;
  }

  // ── Timeout watchdog ─────────────────────────────────────
  let timedOut = false;
  const timeoutMs = job.timeout_at
    ? Math.max(0, new Date(job.timeout_at).getTime() - Date.now())
    : config.defaultTimeoutMs;

  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    logger.warn({ jobId: job.id, timeoutMs }, "Job timeout triggered");
  }, timeoutMs);

  // ── Progress heartbeat (every 30s) ───────────────────────
  let currentProgress = job.progress;
  let currentMessage = job.progress_message;

  const heartbeatInterval = setInterval(() => {
    if (timedOut || shuttingDown) return;
    void consumer.updateProgress(job.id, currentProgress, currentMessage);
  }, 30_000);

  // Wrap updateProgress to track current values + check timeout
  const trackedProgress = async (
    progress: number,
    message: string | null,
  ): Promise<void> => {
    if (timedOut) throw new Error("Job timed out");
    currentProgress = progress;
    currentMessage = message;
    await consumer.updateProgress(job.id, progress, message);
  };

  // ── Execute handler ──────────────────────────────────────
  try {
    const result = await handler(job, trackedProgress);

    if (timedOut) throw new Error("Job timed out");

    await consumer.completeJob(job.id, result);
    logger.info({ jobId: job.id }, "Job completed successfully");

    await writeAuditLog(job.created_by, job.client_id, "job.completed", {
      job_id: job.id,
      job_type: jobType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = timedOut ? "TIMEOUT" : "HANDLER_ERROR";
    const stack = err instanceof Error ? err.stack : undefined;

    logger.error({ jobId: job.id, error: message, code }, "Job failed");

    const outcome = await consumer.failJob(
      job.id,
      { message, code, stack },
      job.retry_count,
      maxRetries,
    );

    logger.info(
      { jobId: job.id, outcome, retry: job.retry_count + 1, maxRetries },
      outcome === "requeued" ? "Job requeued for retry" : "Job permanently failed",
    );

    await writeAuditLog(job.created_by, job.client_id, "job.failed", {
      job_id: job.id,
      job_type: jobType,
      error: message,
      outcome,
    });
  } finally {
    clearTimeout(timeoutTimer);
    clearInterval(heartbeatInterval);
  }
}

// ── Main poll loop ───────────────────────────────────────────

async function main(): Promise<void> {
  logger.info(
    { pollIntervalMs: POLL_INTERVAL_MS },
    "Job runner started — polling for jobs",
  );

  while (!shuttingDown) {
    try {
      await processJob();
    } catch (err) {
      logger.error({ error: err }, "Unhandled error in poll loop");
    }

    await sleep(POLL_INTERVAL_MS);
  }

  logger.info("Job runner stopped gracefully");
}

// ── Graceful shutdown ────────────────────────────────────────

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down...");
  shuttingDown = true;
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down...");
  shuttingDown = true;
});

main().catch((err) => {
  logger.fatal({ error: err }, "Fatal error in job runner");
  process.exit(1);
});
