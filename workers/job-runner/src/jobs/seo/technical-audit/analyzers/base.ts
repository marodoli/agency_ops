import type { CrawledPage, Issue } from "@agency-ops/shared";
import type { PageSpeedResult } from "../pagespeed";

export type AnalyzerInput = {
  pages: CrawledPage[];
  robotsTxt: string | null;
  sitemapUrls: string[];
  pageSpeedResults?: PageSpeedResult[];
};

export type Analyzer = (input: AnalyzerInput) => Issue[];
