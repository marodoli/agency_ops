"use client";

import { useMemo } from "react";
import type { Issue, TechnicalAuditCategories } from "@agency-ops/shared";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_LABELS,
  SEVERITY_ORDER,
  getScoreColor,
  getScoreBg,
} from "@/lib/seo-utils";
import { IssueCard } from "./issue-card";
import type { SeverityFilter } from "./issue-filter-bar";

type FilteredCategorySectionProps = {
  categories: TechnicalAuditCategories;
  severityFilter: SeverityFilter;
  selectedCategories: Set<string>;
  searchQuery: string;
  onIssueClick: (categoryKey: string, issue: Issue) => void;
  onClearFilters: () => void;
};

export function FilteredCategorySection({
  categories,
  severityFilter,
  selectedCategories,
  searchQuery,
  onIssueClick,
  onClearFilters,
}: FilteredCategorySectionProps) {
  const { entries, filteredTotal, totalIssues } = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let total = 0;
    let filtered = 0;

    const categoryKeys = Object.keys(CATEGORY_LABELS) as (keyof TechnicalAuditCategories)[];
    const result: {
      key: keyof TechnicalAuditCategories;
      label: string;
      score: number;
      issues: Issue[];
    }[] = [];

    for (const key of categoryKeys) {
      const category = categories[key];
      total += category.issues.length;

      // Skip if category filter is active and this category is not selected
      if (selectedCategories.size > 0 && !selectedCategories.has(key)) continue;

      let issues = category.issues;

      // Filter by severity
      if (severityFilter !== "all") {
        issues = issues.filter((i) => i.severity === severityFilter);
      }

      // Filter by search query
      if (query) {
        issues = issues.filter(
          (i) =>
            i.title.toLowerCase().includes(query) ||
            i.description.toLowerCase().includes(query),
        );
      }

      if (issues.length === 0) continue;

      // Sort by severity
      const sorted = [...issues].sort(
        (a, b) =>
          (SEVERITY_ORDER[a.severity] ?? 2) -
          (SEVERITY_ORDER[b.severity] ?? 2),
      );

      filtered += sorted.length;

      result.push({
        key,
        label: CATEGORY_LABELS[key],
        score: category.score,
        issues: sorted,
      });
    }

    return { entries: result, filteredTotal: filtered, totalIssues: total };
  }, [categories, severityFilter, selectedCategories, searchQuery]);

  const isFiltered =
    severityFilter !== "all" ||
    selectedCategories.size > 0 ||
    searchQuery.length > 0;

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Žádné nálezy neodpovídají filtru.
        </p>
        <Button
          variant="link"
          size="sm"
          className="mt-2"
          onClick={onClearFilters}
        >
          Zrušit filtry
        </Button>
      </div>
    );
  }

  return (
    <div>
      {isFiltered && (
        <p className="mb-3 text-sm text-muted-foreground">
          {filteredTotal} z {totalIssues} nálezů
        </p>
      )}
      <Accordion type="multiple" className="space-y-2">
        {entries.map(({ key, label, score, issues }) => (
          <AccordionItem
            key={key}
            value={key}
            className="rounded-lg border px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="font-medium">{label}</span>
                <Badge
                  variant="outline"
                  className={`${getScoreColor(score)} ${getScoreBg(score)} border-transparent`}
                >
                  {score}/100
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {issues.length} nálezů
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              {issues.map((issue, i) => (
                <IssueCard
                  key={`${key}-${i}`}
                  issue={issue}
                  onClick={() => onIssueClick(key, issue)}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
