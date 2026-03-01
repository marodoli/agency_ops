"use client";

import { ExternalLink, Lightbulb } from "lucide-react";
import type { Issue } from "@agency-ops/shared";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  getSeverityBg,
  getQuadrantColor,
  getQuadrantBg,
  type ScoredIssue,
} from "@/lib/seo-utils";
import type { TechnicalAuditCategories } from "@agency-ops/shared";

const SEVERITY_BADGE_CLASS: Record<string, string> = {
  critical: "bg-error/10 text-error border-error/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-info/10 text-info border-info/20",
};

type IssueDetailSheetProps = {
  issue: Issue | null;
  categoryKey: string | null;
  scoredIssue: ScoredIssue | null;
  open: boolean;
  onClose: () => void;
};

function getImpactClass(impact: number): string {
  if (impact >= 4) return "bg-error/10 text-error border-error/20";
  if (impact === 3) return "bg-warning/10 text-warning border-warning/20";
  return "bg-info/10 text-info border-info/20";
}

function getEffortClass(effort: number): string {
  if (effort >= 4) return "bg-warning/10 text-warning border-warning/20";
  if (effort <= 2) return "bg-success/10 text-success border-success/20";
  return "bg-info/10 text-info border-info/20";
}

export function IssueDetailSheet({
  issue,
  categoryKey,
  scoredIssue,
  open,
  onClose,
}: IssueDetailSheetProps) {
  const maxUrls = 50;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {issue && (
          <>
            <SheetHeader>
              <SheetTitle>{issue.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                {categoryKey && (
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[categoryKey as keyof TechnicalAuditCategories]}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={SEVERITY_BADGE_CLASS[issue.severity]}
                >
                  {SEVERITY_LABELS[issue.severity]}
                </Badge>
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-5">
                {/* Description */}
                {issue.description && (
                  <div>
                    <h4 className="mb-1.5 text-sm font-medium">Popis</h4>
                    <p className="text-sm text-muted-foreground">
                      {issue.description}
                    </p>
                  </div>
                )}

                {/* Recommendation */}
                {issue.recommendation && (
                  <div
                    className={`flex items-start gap-2 rounded-md ${getSeverityBg(issue.severity)} px-3 py-2`}
                  >
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-foreground-secondary" />
                    <p className="text-sm">{issue.recommendation}</p>
                  </div>
                )}

                {/* Impact & Effort */}
                {scoredIssue && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">
                      Impact & Effort
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={getImpactClass(scoredIssue.impact)}
                      >
                        Impact: {scoredIssue.impact}/5
                      </Badge>
                      <Badge
                        variant="outline"
                        className={getEffortClass(scoredIssue.effort)}
                      >
                        Effort: {scoredIssue.effort}/5
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${getQuadrantColor(scoredIssue.quadrant)} ${getQuadrantBg(scoredIssue.quadrant)}`}
                      >
                        {scoredIssue.quadrant}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Affected URLs */}
                {issue.affected_urls.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">
                      Ovlivněné URL ({issue.affected_urls.length})
                    </h4>
                    <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-3">
                      {issue.affected_urls.slice(0, maxUrls).map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 truncate font-mono text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          <span className="truncate">{url}</span>
                        </a>
                      ))}
                      {issue.affected_urls.length > maxUrls && (
                        <p className="pt-1 text-xs text-muted-foreground">
                          ... a dalších{" "}
                          {issue.affected_urls.length - maxUrls} URL
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
