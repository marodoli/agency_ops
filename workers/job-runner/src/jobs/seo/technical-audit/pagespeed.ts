import pino from "pino";
import type { CrawledPage } from "@agency-ops/shared";

const logger = pino({ name: "pagespeed" });

const PSI_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const REQUEST_TIMEOUT_MS = 60_000; // PSI can be slow
const RATE_LIMIT_MS = 1_100; // slightly over 1s to stay safe

// ── Types ────────────────────────────────────────────────────

export type Strategy = "mobile" | "desktop";

export type PageSpeedResult = {
  url: string;
  strategy: Strategy;
  performanceScore: number | null; // 0-100
  lcp: number | null; // ms
  inp: number | null; // ms (CrUX field) or TBT as lab proxy
  cls: number | null; // unitless
  ttfb: number | null; // ms
  source: "field" | "lab";
};

// ── Helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Select URLs to test: homepage + top N pages by inbound link count.
 */
export function selectUrlsForPageSpeed(
  pages: CrawledPage[],
  topN: number = 5,
): string[] {
  if (pages.length === 0) return [];

  // Count inbound links per URL
  const inlinkCount = new Map<string, number>();
  for (const page of pages) {
    for (const link of page.internalLinks) {
      inlinkCount.set(link.href, (inlinkCount.get(link.href) ?? 0) + 1);
    }
  }

  // Find homepage (depth 0, or first page)
  const homepage = pages.find((p) => p.crawlDepth === 0);
  const homepageUrl = homepage?.finalUrl ?? pages[0]?.url;

  const selected = new Set<string>();
  if (homepageUrl) selected.add(homepageUrl);

  // Sort pages by inlink count descending, pick top N (exclude homepage)
  const sorted = pages
    .filter((p) => p.finalUrl !== homepageUrl && p.statusCode === 200)
    .sort(
      (a, b) =>
        (inlinkCount.get(b.finalUrl) ?? 0) -
        (inlinkCount.get(a.finalUrl) ?? 0),
    );

  for (const page of sorted) {
    if (selected.size >= topN + 1) break;
    selected.add(page.finalUrl);
  }

  return Array.from(selected);
}

// ── PSI API call ─────────────────────────────────────────────

async function fetchPsi(
  url: string,
  strategy: Strategy,
  apiKey: string | undefined,
): Promise<PageSpeedResult | null> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
  });
  if (apiKey) params.set("key", apiKey);

  const endpoint = `${PSI_ENDPOINT}?${params.toString()}`;

  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn(
        { url, strategy, status: res.status, body: body.slice(0, 200) },
        "PSI API error",
      );
      return null;
    }

    const data = await res.json();
    return extractMetrics(url, strategy, data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ url, strategy, error: message }, "PSI API request failed");
    return null;
  }
}

// ── Extract metrics from PSI response ────────────────────────

function extractMetrics(
  url: string,
  strategy: Strategy,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PSI response is deeply nested untyped JSON
  data: any,
): PageSpeedResult {
  // Try CrUX field data first
  const fieldMetrics = data?.loadingExperience?.metrics;
  const hasField = fieldMetrics && data?.loadingExperience?.overall_category;

  if (hasField) {
    return {
      url,
      strategy,
      performanceScore: extractLabScore(data),
      lcp: fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
      inp: fieldMetrics.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
      cls:
        fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null
          ? fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
          : null,
      ttfb:
        fieldMetrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile ?? null,
      source: "field",
    };
  }

  // Fallback to Lighthouse lab data
  const audits = data?.lighthouseResult?.audits;
  if (!audits) {
    logger.warn({ url, strategy }, "No audit data in PSI response");
    return {
      url,
      strategy,
      performanceScore: null,
      lcp: null,
      inp: null,
      cls: null,
      ttfb: null,
      source: "lab",
    };
  }

  return {
    url,
    strategy,
    performanceScore: extractLabScore(data),
    lcp: numericOrNull(audits["largest-contentful-paint"]),
    inp: numericOrNull(audits["total-blocking-time"]), // TBT as INP proxy
    cls: numericOrNull(audits["cumulative-layout-shift"]),
    ttfb: numericOrNull(audits["server-response-time"]),
    source: "lab",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PSI audit entry
function numericOrNull(audit: any): number | null {
  return typeof audit?.numericValue === "number" ? audit.numericValue : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PSI response
function extractLabScore(data: any): number | null {
  const score = data?.lighthouseResult?.categories?.performance?.score;
  return typeof score === "number" ? Math.round(score * 100) : null;
}

// ── Main function ────────────────────────────────────────────

export type PageSpeedConfig = {
  urls: string[];
  strategies?: Strategy[];
  apiKey?: string;
  progressCallback?: (done: number, total: number) => Promise<void>;
};

export async function runPageSpeed(
  config: PageSpeedConfig,
): Promise<PageSpeedResult[]> {
  const {
    urls,
    strategies = ["mobile", "desktop"],
    apiKey = process.env.PSI_API_KEY,
    progressCallback,
  } = config;

  if (urls.length === 0) return [];

  const totalRequests = urls.length * strategies.length;
  const results: PageSpeedResult[] = [];
  let completed = 0;

  logger.info(
    { urlCount: urls.length, strategies, totalRequests },
    "Starting PageSpeed analysis",
  );

  for (const url of urls) {
    for (const strategy of strategies) {
      const result = await fetchPsi(url, strategy, apiKey);

      if (result) {
        results.push(result);
        logger.info(
          {
            url,
            strategy,
            score: result.performanceScore,
            source: result.source,
          },
          "PSI result",
        );
      }

      completed++;
      if (progressCallback) {
        await progressCallback(completed, totalRequests);
      }

      // Rate limit: wait before next request
      if (completed < totalRequests) {
        await sleep(RATE_LIMIT_MS);
      }
    }
  }

  logger.info(
    { results: results.length, total: totalRequests },
    "PageSpeed analysis complete",
  );

  return results;
}
