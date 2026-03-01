import pino from "pino";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import { parseStringPromise } from "xml2js";
import type { CrawledPage, RedirectHop, LinkData, ImageData, HreflangEntry } from "@agency-ops/shared";

const logger = pino({ name: "crawler" });

const USER_AGENT = "MacroBot/1.0 (+https://macroconsulting.cz/bot)";
const REQUEST_TIMEOUT_MS = 10_000;
const POLITENESS_DELAY_MS = 200;
const MAX_CONCURRENT = 5;

// ── Types ────────────────────────────────────────────────────

export type CrawlConfig = {
  domain: string;
  maxDepth: number;
  maxPages: number;
  progressCallback: (crawled: number, total: number) => Promise<void>;
};

export type CrawlResult = {
  pages: CrawledPage[];
  robotsTxt: string | null;
  sitemapUrls: string[];
  baseUrl: string;
};

type QueueItem = { url: string; depth: number };

// ── Semaphore (concurrency limiter) ──────────────────────────

class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) {
      this.active++;
      next();
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    url.hash = "";
    // Remove trailing slash for consistency (except root)
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.href;
  } catch {
    return null;
  }
}

function isSameOrigin(url: string, baseOrigin: string): boolean {
  try {
    return new URL(url).origin === baseOrigin;
  } catch {
    return false;
  }
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Step 1: Resolve base URL ─────────────────────────────────

async function resolveBaseUrl(domain: string): Promise<string> {
  const candidates = [
    `https://${domain}`,
    `https://www.${domain}`,
    `http://${domain}`,
  ];

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { "User-Agent": USER_AGENT },
      });
      // Use the final URL after redirects
      const finalUrl = res.url || candidate;
      const origin = new URL(finalUrl).origin;
      logger.info({ candidate, finalUrl: origin }, "Resolved base URL");
      return origin;
    } catch {
      continue;
    }
  }

  // Fallback
  return `https://${domain}`;
}

// ── Step 2: Fetch & parse robots.txt ─────────────────────────

async function fetchRobotsTxt(
  baseUrl: string,
): Promise<{ parser: ReturnType<typeof robotsParser>; raw: string | null }> {
  const url = `${baseUrl}/robots.txt`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      logger.warn({ url, status: res.status }, "robots.txt not found");
      return { parser: robotsParser(url, ""), raw: null };
    }
    const text = await res.text();
    return { parser: robotsParser(url, text), raw: text };
  } catch (err) {
    logger.warn({ url, error: err }, "Failed to fetch robots.txt");
    return { parser: robotsParser(url, ""), raw: null };
  }
}

// ── Step 3: Fetch & parse sitemap.xml ────────────────────────

async function fetchSitemapUrls(
  baseUrl: string,
  robotsRaw: string | null,
): Promise<string[]> {
  // Find sitemap URLs from robots.txt
  const sitemapUrls: string[] = [];
  if (robotsRaw) {
    const matches = robotsRaw.match(/^Sitemap:\s*(.+)$/gim);
    if (matches) {
      for (const m of matches) {
        const url = m.replace(/^Sitemap:\s*/i, "").trim();
        if (url) sitemapUrls.push(url);
      }
    }
  }

  // Fallback: try default location
  if (sitemapUrls.length === 0) {
    sitemapUrls.push(`${baseUrl}/sitemap.xml`);
  }

  const collected = new Set<string>();

  for (const sitemapUrl of sitemapUrls) {
    try {
      const res = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const parsed = await parseStringPromise(xml, { explicitArray: false });

      // Sitemap index
      if (parsed.sitemapindex?.sitemap) {
        const entries = Array.isArray(parsed.sitemapindex.sitemap)
          ? parsed.sitemapindex.sitemap
          : [parsed.sitemapindex.sitemap];
        for (const entry of entries) {
          const loc = (entry as { loc?: string }).loc;
          if (loc) {
            // Recursively fetch child sitemaps (one level)
            const childUrls = await fetchSingleSitemap(loc);
            for (const u of childUrls) collected.add(u);
          }
        }
      }

      // Regular sitemap
      if (parsed.urlset?.url) {
        const entries = Array.isArray(parsed.urlset.url)
          ? parsed.urlset.url
          : [parsed.urlset.url];
        for (const entry of entries) {
          const loc = (entry as { loc?: string }).loc;
          if (loc) collected.add(loc);
        }
      }
    } catch (err) {
      logger.warn({ sitemapUrl, error: err }, "Failed to parse sitemap");
    }
  }

  logger.info({ count: collected.size }, "Sitemap URLs collected");
  return Array.from(collected);
}

async function fetchSingleSitemap(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });

    if (!parsed.urlset?.url) return [];
    const entries = Array.isArray(parsed.urlset.url)
      ? parsed.urlset.url
      : [parsed.urlset.url];
    return entries
      .map((e: { loc?: string }) => e.loc)
      .filter((loc: string | undefined): loc is string => typeof loc === "string");
  } catch {
    return [];
  }
}

// ── Page parser (cheerio) ────────────────────────────────────

function parsePage(
  url: string,
  html: string,
  statusCode: number,
  redirectChain: RedirectHop[],
  responseTimeMs: number,
  xRobotsTag: string | null,
  contentLength: number,
  baseOrigin: string,
  depth: number,
): { page: CrawledPage; discoveredUrls: string[] } {
  const $ = cheerio.load(html);

  // Title
  const title = $("title").first().text().trim() || null;

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;

  // Canonical
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;

  // Meta robots
  const metaRobots =
    $('meta[name="robots"]').attr("content")?.trim() || null;

  // Viewport
  const viewport =
    $('meta[name="viewport"]').attr("content")?.trim() || null;

  // Max image preview
  const maxImagePreview =
    $('meta[name="robots"]')
      .attr("content")
      ?.match(/max-image-preview:(\S+)/i)?.[1] || null;

  // Hreflang
  const hreflang: HreflangEntry[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang");
    const href = $(el).attr("href");
    if (lang && href) hreflang.push({ lang, href });
  });

  // Headings
  const h1: string[] = [];
  const h2: string[] = [];
  const h3: string[] = [];
  $("h1").each((_, el) => { h1.push($(el).text().trim()); });
  $("h2").each((_, el) => { h2.push($(el).text().trim()); });
  $("h3").each((_, el) => { h3.push($(el).text().trim()); });

  // Body text word count
  const bodyText = $("body").text();
  const wc = wordCount(bodyText);

  // Links
  const internalLinks: LinkData[] = [];
  const externalLinks: LinkData[] = [];
  const discoveredUrls: string[] = [];

  $("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href");
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;

    const resolved = normalizeUrl(rawHref, url);
    if (!resolved) return;

    const anchorText = $(el).text().trim();
    const isNofollow = ($(el).attr("rel") || "").includes("nofollow");

    if (isSameOrigin(resolved, baseOrigin)) {
      internalLinks.push({ href: resolved, anchorText, isNofollow });
      discoveredUrls.push(resolved);
    } else {
      externalLinks.push({ href: resolved, anchorText, isNofollow });
    }
  });

  // Images
  const images: ImageData[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (!src) return;
    const resolvedSrc = normalizeUrl(src, url) ?? src;
    images.push({
      src: resolvedSrc,
      alt: $(el).attr("alt") ?? null,
      width: $(el).attr("width") ? Number($(el).attr("width")) : null,
      height: $(el).attr("height") ? Number($(el).attr("height")) : null,
      sizeKb: null, // Would need HEAD request — skipped for performance
      format: resolvedSrc.match(/\.(jpe?g|png|gif|webp|avif|svg)/i)?.[1] ?? null,
    });
  });

  // JSON-LD
  const jsonLd: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() ?? "");
      if (parsed) jsonLd.push(parsed as Record<string, unknown>);
    } catch {
      // Invalid JSON-LD — skip
    }
  });

  // Final URL (last redirect destination, or original)
  const finalUrl = redirectChain.length > 0
    ? redirectChain[redirectChain.length - 1]?.to ?? url
    : url;

  const page: CrawledPage = {
    url,
    finalUrl,
    statusCode,
    redirectChain,
    responseTimeMs,
    contentType: "text/html",
    contentLength,

    title,
    metaDescription,
    canonical,
    metaRobots,
    xRobotsTag,
    viewport,
    hreflang,
    maxImagePreview,

    h1,
    h2,
    h3,
    wordCount: wc,
    rawHtmlLength: html.length,

    internalLinks,
    externalLinks,
    brokenLinks: [], // Populated during broken link detection pass

    images,

    jsonLd,
    microdata: [], // Microdata parsing is complex — deferred

    jsRenderDiff: null, // Set by JS rendering pass

    crawledAt: new Date().toISOString(),
    crawlDepth: depth,
  };

  return { page, discoveredUrls };
}

// ── Fetch single page ────────────────────────────────────────

async function fetchPage(
  url: string,
  baseOrigin: string,
  depth: number,
): Promise<{ page: CrawledPage; discoveredUrls: string[] } | null> {
  const start = Date.now();
  const redirectChain: RedirectHop[] = [];

  try {
    // Manual redirect tracking
    let currentUrl = url;
    let response: Response | null = null;
    const maxRedirects = 10;

    for (let i = 0; i < maxRedirects; i++) {
      const res = await fetch(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) break;

        const nextUrl = normalizeUrl(location, currentUrl);
        if (!nextUrl) break;

        redirectChain.push({
          from: currentUrl,
          to: nextUrl,
          statusCode: res.status,
        });
        currentUrl = nextUrl;
        continue;
      }

      response = res;
      break;
    }

    if (!response) {
      logger.warn({ url }, "Too many redirects or no final response");
      return null;
    }

    const responseTimeMs = Date.now() - start;
    const xRobotsTag = response.headers.get("x-robots-tag");
    const contentType = response.headers.get("content-type") ?? "";

    // Only parse HTML
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }

    const html = await response.text();

    return parsePage(
      url,
      html,
      response.status,
      redirectChain,
      responseTimeMs,
      xRobotsTag,
      html.length,
      baseOrigin,
      depth,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ url, error: message }, "Failed to fetch page");
    return null;
  }
}

// ── Main crawl function ──────────────────────────────────────

export async function crawl(config: CrawlConfig): Promise<CrawlResult> {
  const { domain, maxDepth, maxPages, progressCallback } = config;

  // Step 1: Resolve base URL
  const baseUrl = await resolveBaseUrl(domain);
  const baseOrigin = new URL(baseUrl).origin;

  // Step 2: Fetch robots.txt
  const { parser: robots, raw: robotsTxt } = await fetchRobotsTxt(baseUrl);

  // Step 3: Fetch sitemap URLs
  const sitemapUrls = await fetchSitemapUrls(baseUrl, robotsTxt);

  // Step 4: BFS crawl
  const visited = new Set<string>();
  const pages: CrawledPage[] = [];
  const semaphore = new Semaphore(MAX_CONCURRENT);

  // Seed queue: base URL first, then sitemap URLs (limited to same origin)
  const queue: QueueItem[] = [{ url: `${baseUrl}/`, depth: 0 }];
  for (const sUrl of sitemapUrls) {
    if (isSameOrigin(sUrl, baseOrigin)) {
      const normalized = normalizeUrl(sUrl, baseUrl);
      if (normalized && !visited.has(normalized)) {
        queue.push({ url: normalized, depth: 1 });
      }
    }
  }

  let crawledCount = 0;
  let lastProgressReport = 0;

  // Process queue with concurrency
  while (queue.length > 0 && crawledCount < maxPages) {
    // Take a batch up to MAX_CONCURRENT
    const batchSize = Math.min(queue.length, MAX_CONCURRENT, maxPages - crawledCount);
    const batch = queue.splice(0, batchSize);

    const tasks = batch.map(async (item) => {
      // Skip already visited
      const normalized = normalizeUrl(item.url, baseUrl);
      if (!normalized || visited.has(normalized)) return;
      visited.add(normalized);

      // Skip if blocked by robots.txt
      if (!robots.isAllowed(normalized, USER_AGENT)) {
        logger.debug({ url: normalized }, "Blocked by robots.txt");
        return;
      }

      await semaphore.acquire();
      try {
        await sleep(POLITENESS_DELAY_MS);

        const result = await fetchPage(normalized, baseOrigin, item.depth);
        if (!result) return;

        pages.push(result.page);
        crawledCount++;

        // Discover new URLs (if not at max depth)
        if (item.depth < maxDepth) {
          for (const discovered of result.discoveredUrls) {
            const normDiscovered = normalizeUrl(discovered, baseUrl);
            if (
              normDiscovered &&
              !visited.has(normDiscovered) &&
              isSameOrigin(normDiscovered, baseOrigin)
            ) {
              queue.push({ url: normDiscovered, depth: item.depth + 1 });
            }
          }
        }

        // Report progress every 10 pages
        if (crawledCount - lastProgressReport >= 10) {
          lastProgressReport = crawledCount;
          await progressCallback(crawledCount, maxPages);
        }
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(tasks);
  }

  // Final progress report
  await progressCallback(crawledCount, maxPages);

  logger.info(
    { crawledCount, visited: visited.size, maxPages },
    "Crawl finished",
  );

  return { pages, robotsTxt, sitemapUrls, baseUrl };
}
