"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import type { Issue } from "@agency-ops/shared";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getSeverityBorder, getSeverityBg } from "@/lib/seo-utils";

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Kritický",
  warning: "Varování",
  info: "Info",
};

const SEVERITY_BADGE_CLASS: Record<string, string> = {
  critical: "bg-error/10 text-error border-error/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-info/10 text-info border-info/20",
};

type IssueCardProps = {
  issue: Issue;
};

export function IssueCard({ issue }: IssueCardProps) {
  const [urlsOpen, setUrlsOpen] = useState(false);
  const maxUrls = 20;
  const visibleUrls = issue.affected_urls.slice(0, maxUrls);
  const hasMore = issue.affected_urls.length > maxUrls;

  return (
    <div
      className={`rounded-md border border-l-4 ${getSeverityBorder(issue.severity)} p-4`}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <Badge
          variant="outline"
          className={SEVERITY_BADGE_CLASS[issue.severity]}
        >
          {SEVERITY_LABEL[issue.severity]}
        </Badge>
        <span className="font-medium">{issue.title}</span>
      </div>

      {/* Description */}
      {issue.description && (
        <p className="mt-2 text-sm text-muted-foreground">
          {issue.description}
        </p>
      )}

      {/* Recommendation */}
      {issue.recommendation && (
        <div className={`mt-3 flex items-start gap-2 rounded-md ${getSeverityBg(issue.severity)} px-3 py-2`}>
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-foreground-secondary" />
          <p className="text-sm">{issue.recommendation}</p>
        </div>
      )}

      {/* Affected URLs */}
      {issue.affected_urls.length > 0 && (
        <Collapsible open={urlsOpen} onOpenChange={setUrlsOpen} className="mt-3">
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown
              className={`size-3.5 transition-transform ${urlsOpen ? "rotate-180" : ""}`}
            />
            {urlsOpen
              ? "Skrýt URL"
              : `Zobrazit ${issue.affected_urls.length} URL`}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-1">
              {visibleUrls.map((url) => (
                <li key={url} className="truncate text-xs font-mono text-muted-foreground">
                  {url}
                </li>
              ))}
              {hasMore && (
                <li className="text-xs text-muted-foreground">
                  ... a dalších {issue.affected_urls.length - maxUrls}
                </li>
              )}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
