import type { CrawledPage, Issue } from "@agency-ops/shared";

export type AnalyzerInput = {
  pages: CrawledPage[];
  robotsTxt: string | null;
  sitemapUrls: string[];
};

export type Analyzer = (input: AnalyzerInput) => Issue[];
