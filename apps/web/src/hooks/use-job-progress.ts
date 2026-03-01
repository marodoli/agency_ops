"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type JobProgress = {
  status: string;
  progress: number;
  progressMessage: string | null;
};

/**
 * Subscribe to Supabase Realtime for job progress updates.
 * Returns live status, progress percentage, and progress message.
 *
 * Automatically unsubscribes when the job reaches a terminal state
 * (completed, failed, cancelled) or when the component unmounts.
 */
export function useJobProgress(
  jobId: string,
  initialState?: Partial<JobProgress>,
): JobProgress {
  const [state, setState] = useState<JobProgress>({
    status: initialState?.status ?? "queued",
    progress: initialState?.progress ?? 0,
    progressMessage: initialState?.progressMessage ?? null,
  });

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`job:${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const row = payload.new as {
            status: string;
            progress: number;
            progress_message: string | null;
          };

          setState({
            status: row.status,
            progress: row.progress,
            progressMessage: row.progress_message,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  return state;
}
