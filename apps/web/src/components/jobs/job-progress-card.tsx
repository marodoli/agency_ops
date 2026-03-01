"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
  Ban,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

import { useJobProgress } from "@/hooks/use-job-progress";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type JobProgressCardProps = {
  jobId: string;
  jobType: string;
  initialStatus: string;
  initialProgress: number;
  initialMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  error: { message: string; code?: string } | null;
  clientSlug: string;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  queued: { label: "Ve frontě", variant: "secondary" },
  running: { label: "Běží", variant: "default" },
  completed: { label: "Dokončeno", variant: "outline" },
  failed: { label: "Selhalo", variant: "destructive" },
  cancelled: { label: "Zrušeno", variant: "secondary" },
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(
    Date.now() - new Date(startedAt).getTime(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(startedAt).getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="text-xs text-muted-foreground">
      Uplynulý čas: {formatElapsed(elapsed)}
    </span>
  );
}

export function JobProgressCard({
  jobId,
  jobType,
  initialStatus,
  initialProgress,
  initialMessage,
  startedAt,
  completedAt,
  error: initialError,
  clientSlug,
}: JobProgressCardProps) {
  const { status, progress, progressMessage } = useJobProgress(jobId, {
    status: initialStatus,
    progress: initialProgress,
    progressMessage: initialMessage,
  });

  // Fetch error details when job fails during realtime
  const [error, setError] = useState(initialError);
  useEffect(() => {
    if (status === "failed" && !error) {
      fetch(`/api/jobs/${jobId}`)
        .then((res) => res.json())
        .then((body) => {
          if (body.data?.error) {
            setError(body.data.error as { message: string; code?: string });
          }
        })
        .catch(() => {});
    }
  }, [status, jobId, error]);

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.queued;
  const jobLabel =
    jobType === "seo.technical-audit"
      ? "Technická SEO analýza"
      : "Analýza";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-lg">{jobLabel}</CardTitle>
        <Badge variant={config?.variant}>{config?.label}</Badge>
      </CardHeader>

      <CardContent className="grid gap-4">
        {/* Queued */}
        {status === "queued" && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Clock className="size-5 animate-pulse" />
            <span>Čeká ve frontě...</span>
          </div>
        )}

        {/* Running */}
        {status === "running" && (
          <>
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  {progressMessage ?? "Zpracovávám..."}
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            {startedAt && <ElapsedTimer startedAt={startedAt} />}
          </>
        )}

        {/* Completed */}
        {status === "completed" && (
          <div className="flex items-center gap-3 text-sm text-success">
            <CheckCircle className="size-5" />
            <span>Analýza byla úspěšně dokončena.</span>
          </div>
        )}

        {/* Failed */}
        {status === "failed" && (
          <div className="grid gap-2">
            <div className="flex items-center gap-3 text-sm text-destructive">
              <XCircle className="size-5" />
              <span>Analýza selhala.</span>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
                {error.code && (
                  <span className="ml-2 font-mono text-xs">
                    ({error.code})
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Cancelled */}
        {status === "cancelled" && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Ban className="size-5" />
            <span>Analýza byla zrušena.</span>
          </div>
        )}

        {/* Completed/failed: timestamps */}
        {completedAt && (status === "completed" || status === "failed") && (
          <p className="text-xs text-muted-foreground">
            Dokončeno:{" "}
            {new Date(completedAt).toLocaleString("cs-CZ")}
          </p>
        )}
      </CardContent>

      <CardFooter className="gap-3">
        {status === "completed" && (
          <Button asChild>
            <Link href={`/clients/${clientSlug}`}>Zobrazit klienta</Link>
          </Button>
        )}
        {status === "failed" && (
          <Button variant="outline" asChild>
            <Link href="/seo/technical-audit">
              <RotateCcw className="size-4" />
              Zkusit znovu
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={`/clients/${clientSlug}`}>Zpět na klienta</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
