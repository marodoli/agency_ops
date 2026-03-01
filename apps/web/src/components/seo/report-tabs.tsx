"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  Issue,
  PageResult,
  TechnicalAuditCategories,
  TechnicalAuditSummary,
} from "@agency-ops/shared";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { ScoredIssue } from "@/lib/seo-utils";
import { IssueFilterBar, type SeverityFilter } from "./issue-filter-bar";
import { FilteredCategorySection } from "./filtered-category-section";
import { IssueDetailSheet } from "./issue-detail-sheet";
import { ActionPlan } from "./action-plan";
import { CrawlStatsTab } from "./crawl-stats-tab";
import { AuditLimitations } from "./audit-limitations";

type ReportTabsProps = {
  categories: TechnicalAuditCategories;
  pages: PageResult[];
  aiRecommendations: string;
  scoredIssues: Record<string, ScoredIssue>;
  summary: TechnicalAuditSummary;
};

export function ReportTabs({
  categories,
  pages,
  aiRecommendations,
  scoredIssues,
  summary,
}: ReportTabsProps) {
  // Filter state
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Sheet state
  const [selectedIssue, setSelectedIssue] = useState<{
    issue: Issue;
    categoryKey: string;
  } | null>(null);

  const counts = useMemo(
    () => ({
      total: summary.total_issues,
      critical: summary.critical_count,
      warning: summary.warning_count,
      info: summary.info_count,
    }),
    [summary],
  );

  const handleIssueClick = useCallback(
    (categoryKey: string, issue: Issue) => {
      setSelectedIssue({ issue, categoryKey });
    },
    [],
  );

  const handleCloseSheet = useCallback(() => {
    setSelectedIssue(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSeverityFilter("all");
    setSelectedCategories(new Set());
    setSearchQuery("");
  }, []);

  const activeScoredIssue = selectedIssue
    ? scoredIssues[selectedIssue.issue.title.toLowerCase()] ?? null
    : null;

  return (
    <>
      <Tabs defaultValue="findings">
        <TabsList>
          <TabsTrigger value="findings">
            Nálezy
            <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
              {summary.total_issues}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="action-plan">Akční plán</TabsTrigger>
          <TabsTrigger value="stats">Statistiky</TabsTrigger>
          <TabsTrigger value="limitations">Omezení</TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="mt-6 space-y-4">
          <IssueFilterBar
            severityFilter={severityFilter}
            onSeverityChange={setSeverityFilter}
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            counts={counts}
          />
          <FilteredCategorySection
            categories={categories}
            severityFilter={severityFilter}
            selectedCategories={selectedCategories}
            searchQuery={searchQuery}
            onIssueClick={handleIssueClick}
            onClearFilters={handleClearFilters}
          />
        </TabsContent>

        <TabsContent value="action-plan" className="mt-6">
          <ActionPlan aiRecommendations={aiRecommendations} />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <CrawlStatsTab pages={pages} />
        </TabsContent>

        <TabsContent value="limitations" className="mt-6">
          <AuditLimitations />
        </TabsContent>
      </Tabs>

      <IssueDetailSheet
        issue={selectedIssue?.issue ?? null}
        categoryKey={selectedIssue?.categoryKey ?? null}
        scoredIssue={activeScoredIssue}
        open={selectedIssue !== null}
        onClose={handleCloseSheet}
      />
    </>
  );
}
