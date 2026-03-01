import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { TechnicalAuditSummary } from "@agency-ops/shared";

import { Card, CardContent } from "@/components/ui/card";
import { getScoreColor, getScoreLabel } from "@/lib/seo-utils";

type ScoreCardsProps = {
  summary: TechnicalAuditSummary;
};

export function ScoreCards({ summary }: ScoreCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Overall Score */}
      <Card>
        <CardContent className="flex flex-col items-center text-center">
          <span className={`text-3xl font-bold ${getScoreColor(summary.overall_score)}`}>
            {summary.overall_score}
            <span className="text-lg font-normal text-muted-foreground">
              /100
            </span>
          </span>
          <span className={`text-sm ${getScoreColor(summary.overall_score)}`}>
            {getScoreLabel(summary.overall_score)}
          </span>
        </CardContent>
      </Card>

      {/* Critical */}
      <Card>
        <CardContent className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-error">
            <AlertTriangle className="size-5" />
            <span className="text-3xl font-bold">{summary.critical_count}</span>
          </div>
          <span className="text-sm text-muted-foreground">Kritických</span>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card>
        <CardContent className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle className="size-5" />
            <span className="text-3xl font-bold">{summary.warning_count}</span>
          </div>
          <span className="text-sm text-muted-foreground">Varování</span>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-info">
            <Info className="size-5" />
            <span className="text-3xl font-bold">{summary.info_count}</span>
          </div>
          <span className="text-sm text-muted-foreground">Info</span>
        </CardContent>
      </Card>
    </div>
  );
}
