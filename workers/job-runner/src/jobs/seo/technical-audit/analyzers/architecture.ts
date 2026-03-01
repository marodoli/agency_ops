import type { Issue } from "@agency-ops/shared";
import type { AnalyzerInput } from "./base";

/**
 * Architecture analyzer — checks click depth, orphan pages,
 * internal link distribution, URL quality.
 */
export function analyzeArchitecture(input: AnalyzerInput): Issue[] {
  const { pages, sitemapUrls } = input;
  const issues: Issue[] = [];

  const validPages = pages.filter((p) => p.statusCode === 200);

  // ── Click depth > 5 → CRITICAL ──────────────────────────────
  const deepPages = validPages.filter((p) => p.crawlDepth > 5);
  if (deepPages.length > 0) {
    issues.push({
      severity: "critical",
      title: "Stránky s click depth > 5",
      description: `${deepPages.length} stránek vyžaduje více než 5 kliknutí z homepage. Vyhledávače mohou tyto stránky považovat za méně důležité.`,
      affected_urls: deepPages.map((p) => p.finalUrl),
      recommendation:
        "Zkraťte cestu k důležitým stránkám — přidejte interní odkazy z vyšších úrovní navigace.",
    });
  }

  // ── Click depth > 4 on important pages → WARNING ────────────
  const depth4Pages = validPages.filter(
    (p) => p.crawlDepth > 4 && p.crawlDepth <= 5,
  );
  if (depth4Pages.length > 0) {
    issues.push({
      severity: "warning",
      title: "Důležité stránky s click depth > 4",
      description: `${depth4Pages.length} stránek vyžaduje více než 4 kliknutí z homepage. Ideální click depth pro důležité stránky je max 3–4.`,
      affected_urls: depth4Pages.map((p) => p.finalUrl),
      recommendation:
        "Zvažte přidání odkazů z hlavní navigace, kategorických stránek nebo sidebaru.",
    });
  }

  // ── Orphan pages → WARNING ───────────────────────────────────
  // Pages in sitemap but not reachable via internal links from crawl
  const crawledUrls = new Set(pages.map((p) => normalizeUrl(p.finalUrl)));
  const linkedUrls = new Set<string>();
  for (const page of pages) {
    for (const link of page.internalLinks) {
      linkedUrls.add(normalizeUrl(link.href));
    }
  }

  const orphanPages: string[] = [];
  for (const sUrl of sitemapUrls) {
    const norm = normalizeUrl(sUrl);
    // In sitemap, was crawled, but no page links to it (except self)
    if (crawledUrls.has(norm) && !linkedUrls.has(norm)) {
      orphanPages.push(sUrl);
    }
  }
  if (orphanPages.length > 0) {
    issues.push({
      severity: "warning",
      title: "Osiřelé stránky (orphan pages)",
      description: `${orphanPages.length} stránek je v sitemapě, ale žádná jiná stránka na ně neodkazuje interním linkem. Vyhledávače je mohou považovat za méně důležité.`,
      affected_urls: orphanPages,
      recommendation:
        "Přidejte interní odkazy na tyto stránky z relevantních souvisejících stránek.",
    });
  }

  // ── Pages with < 3 internal links → INFO ─────────────────────
  const lowInlinks: string[] = [];
  const inlinkCount = new Map<string, number>();
  for (const page of pages) {
    for (const link of page.internalLinks) {
      const norm = normalizeUrl(link.href);
      inlinkCount.set(norm, (inlinkCount.get(norm) ?? 0) + 1);
    }
  }
  for (const page of validPages) {
    const norm = normalizeUrl(page.finalUrl);
    const count = inlinkCount.get(norm) ?? 0;
    if (count < 3) {
      lowInlinks.push(page.finalUrl);
    }
  }
  if (lowInlinks.length > 0) {
    issues.push({
      severity: "info",
      title: "Stránky s méně než 3 interními odkazy",
      description: `${lowInlinks.length} stránek má méně než 3 příchozí interní odkazy. Nízký počet interních odkazů snižuje PageRank a viditelnost stránky.`,
      affected_urls: lowInlinks,
      recommendation:
        "Přidejte interní odkazy z tematicky příbuzných stránek. Zvažte sekce 'Související články' nebo kontextové odkazy v obsahu.",
    });
  }

  // ── URLs with parameters without canonical → WARNING ─────────
  const paramUrlsNoCanonical: string[] = [];
  for (const page of validPages) {
    try {
      const u = new URL(page.finalUrl);
      if (u.search && !page.canonical) {
        paramUrlsNoCanonical.push(page.finalUrl);
      }
    } catch {
      // skip invalid URLs
    }
  }
  if (paramUrlsNoCanonical.length > 0) {
    issues.push({
      severity: "warning",
      title: "URL s parametry bez canonical tagu",
      description: `${paramUrlsNoCanonical.length} URL obsahuje query parametry, ale nemá canonical tag. Může vzniknout duplicitní obsah.`,
      affected_urls: paramUrlsNoCanonical,
      recommendation:
        "Přidejte canonical tag na všechny URL s parametry. Canonical by měl směřovat na čistou verzi URL bez parametrů.",
    });
  }

  // ── Non-lowercase URLs → INFO ────────────────────────────────
  const nonLowercase: string[] = [];
  for (const page of validPages) {
    try {
      const u = new URL(page.finalUrl);
      if (u.pathname !== u.pathname.toLowerCase()) {
        nonLowercase.push(page.finalUrl);
      }
    } catch {
      // skip
    }
  }
  if (nonLowercase.length > 0) {
    issues.push({
      severity: "info",
      title: "URL nejsou v lowercase",
      description: `${nonLowercase.length} URL obsahuje velká písmena. Velká a malá písmena v URL mohou vést k duplicitnímu obsahu.`,
      affected_urls: nonLowercase,
      recommendation:
        "Převeďte všechny URL na lowercase a nastavte 301 přesměrování z verzí s velkými písmeny.",
    });
  }

  // ── URLs > 115 characters → INFO ──────────────────────────────
  const longUrls: string[] = [];
  for (const page of validPages) {
    try {
      const u = new URL(page.finalUrl);
      if (u.pathname.length > 115) {
        longUrls.push(page.finalUrl);
      }
    } catch {
      // skip
    }
  }
  if (longUrls.length > 0) {
    issues.push({
      severity: "info",
      title: "URL delší než 115 znaků",
      description: `${longUrls.length} URL má cestu delší než 115 znaků. Příliš dlouhé URL jsou hůře sdílitelné a mohou být oříznuty ve výsledcích vyhledávání.`,
      affected_urls: longUrls,
      recommendation:
        "Zkraťte URL cesty — používejte stručné, popisné sluge bez zbytečných slov a parametrů.",
    });
  }

  return issues;
}

// ── Helpers ──────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
