"use client";

import type { TechnicalAuditCategories } from "@agency-ops/shared";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, getScoreColor, getScoreBg } from "@/lib/seo-utils";
import { IssueCard } from "./issue-card";

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

type CategorySectionProps = {
  categories: TechnicalAuditCategories;
};

export function CategorySection({ categories }: CategorySectionProps) {
  const entries = (
    Object.entries(CATEGORY_LABELS) as [keyof TechnicalAuditCategories, string][]
  ).filter(([key]) => categories[key].issues.length > 0);

  if (entries.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Kategorie</h2>
      <Accordion type="multiple" className="space-y-2">
        {entries.map(([key, label]) => {
          const category = categories[key];
          const sortedIssues = [...category.issues].sort(
            (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
          );

          return (
            <AccordionItem key={key} value={key} className="rounded-lg border px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{label}</span>
                  <Badge
                    variant="outline"
                    className={`${getScoreColor(category.score)} ${getScoreBg(category.score)} border-transparent`}
                  >
                    {category.score}/100
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {category.issues.length} nálezů
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                {sortedIssues.map((issue, i) => (
                  <IssueCard key={`${key}-${i}`} issue={issue} />
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
