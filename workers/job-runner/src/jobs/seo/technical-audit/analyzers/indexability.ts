import type { Issue } from "@agency-ops/shared";
import type { AnalyzerInput } from "./base";

/**
 * Indexability analyzer — checks robots.txt conflicts, noindex vs sitemap,
 * canonical issues, and sitemap health.
 */
export function analyzeIndexability(input: AnalyzerInput): Issue[] {
  const { pages, robotsTxt, sitemapUrls } = input;
  const issues: Issue[] = [];

  const sitemapUrlSet = new Set(sitemapUrls.map((u) => normalizeForCompare(u)));
  const pagesByUrl = new Map(pages.map((p) => [normalizeForCompare(p.finalUrl), p]));

  // ── Noindex pages in sitemap → CRITICAL ────────────────────
  const noindexInSitemap: string[] = [];
  for (const page of pages) {
    if (!isInSitemap(page.finalUrl, sitemapUrlSet)) continue;
    if (hasNoindex(page)) {
      noindexInSitemap.push(page.finalUrl);
    }
  }
  if (noindexInSitemap.length > 0) {
    issues.push({
      severity: "critical",
      title: "Noindex stránky v sitemapě",
      description: `${noindexInSitemap.length} stránek má noindex tag, ale je v sitemap.xml. Vyhledávače dostávají protichůdné signály.`,
      affected_urls: noindexInSitemap,
      recommendation:
        "Odstraňte tyto URL ze sitemapy, nebo odeberte noindex direktivu, pokud mají být indexovány.",
    });
  }

  // ── Conflicting directives (noindex + in sitemap) → CRITICAL
  // (handled above — same check, listed separately in spec for clarity)

  // ── Canonical pointing to 404/noindex/redirect → CRITICAL ──
  const badCanonicals: string[] = [];
  for (const page of pages) {
    if (!page.canonical) continue;

    const canonNorm = normalizeForCompare(page.canonical);
    const canonTarget = pagesByUrl.get(canonNorm);

    if (canonTarget) {
      // Canonical targets a non-200 page
      if (canonTarget.statusCode !== 200) {
        badCanonicals.push(page.finalUrl);
        continue;
      }
      // Canonical targets a noindex page
      if (hasNoindex(canonTarget)) {
        badCanonicals.push(page.finalUrl);
        continue;
      }
      // Canonical targets a page that redirects
      if (canonTarget.redirectChain.length > 0) {
        badCanonicals.push(page.finalUrl);
      }
    }
  }
  if (badCanonicals.length > 0) {
    issues.push({
      severity: "critical",
      title: "Canonical odkazuje na 404, noindex nebo redirect",
      description: `${badCanonicals.length} stránek má canonical tag směřující na stránku, která je nedostupná, noindexovaná nebo přesměrovaná.`,
      affected_urls: badCanonicals,
      recommendation:
        "Aktualizujte canonical tagy tak, aby odkazovaly na finální, indexovatelné, 200 OK stránky.",
    });
  }

  // ── Canonical chaining → WARNING ──────────────────────────
  const canonChaining: string[] = [];
  for (const page of pages) {
    if (!page.canonical) continue;

    const canonNorm = normalizeForCompare(page.canonical);
    const canonTarget = pagesByUrl.get(canonNorm);

    if (canonTarget?.canonical) {
      const targetCanonNorm = normalizeForCompare(canonTarget.canonical);
      // Canonical of target points somewhere else (chain)
      if (targetCanonNorm !== canonNorm) {
        canonChaining.push(page.finalUrl);
      }
    }
  }
  if (canonChaining.length > 0) {
    issues.push({
      severity: "warning",
      title: "Řetězení canonical tagů",
      description: `${canonChaining.length} stránek má canonical tag, který odkazuje na stránku s jiným canonical — vzniká řetězení.`,
      affected_urls: canonChaining,
      recommendation:
        "Nastavte canonical tagy přímo na finální cílovou URL bez prostředníků.",
    });
  }

  // ── Sitemap contains non-200 URLs → WARNING ───────────────
  const non200InSitemap: string[] = [];
  for (const sUrl of sitemapUrls) {
    const norm = normalizeForCompare(sUrl);
    const page = pagesByUrl.get(norm);
    if (page && page.statusCode !== 200) {
      non200InSitemap.push(sUrl);
    }
  }
  if (non200InSitemap.length > 0) {
    issues.push({
      severity: "warning",
      title: "Sitemap obsahuje non-200 URL",
      description: `${non200InSitemap.length} URL v sitemap.xml nevrací status 200 (přesměrování, 404, 5xx).`,
      affected_urls: non200InSitemap,
      recommendation:
        "Odstraňte ze sitemapy URL, které nevracejí 200 OK. Sitemap by měla obsahovat pouze kanonické, indexovatelné stránky.",
    });
  }

  // ── Missing self-referencing canonical → WARNING ──────────
  const missingSelfCanonical: string[] = [];
  for (const page of pages) {
    if (page.statusCode !== 200) continue;
    if (hasNoindex(page)) continue;

    if (!page.canonical) {
      missingSelfCanonical.push(page.finalUrl);
    } else {
      const selfNorm = normalizeForCompare(page.finalUrl);
      const canonNorm = normalizeForCompare(page.canonical);
      // Has canonical but not self-referencing (and not a different canonical target)
      // We only flag missing canonical, not intentional cross-canonicals
      if (canonNorm !== selfNorm) {
        // This is an intentional cross-canonical — skip
      }
    }
  }
  // Only flag pages without any canonical
  const pagesWithoutCanonical = pages.filter(
    (p) => p.statusCode === 200 && !hasNoindex(p) && !p.canonical,
  );
  if (pagesWithoutCanonical.length > 0) {
    issues.push({
      severity: "warning",
      title: "Chybějící self-referencing canonical",
      description: `${pagesWithoutCanonical.length} indexovatelných stránek nemá canonical tag. Bez canonical hrozí duplikace obsahu.`,
      affected_urls: pagesWithoutCanonical.map((p) => p.finalUrl),
      recommendation:
        "Přidejte na každou indexovatelnou stránku self-referencing canonical tag (<link rel='canonical' href='...' />).",
    });
  }

  // ── robots.txt blocks important sections → CRITICAL ───────
  if (robotsTxt) {
    const blockedPatterns = extractDisallowedPaths(robotsTxt);
    const importantBlocked: string[] = [];

    // Check if any important page paths are blocked
    for (const page of pages) {
      if (page.statusCode !== 200) continue;
      const path = new URL(page.finalUrl).pathname;
      for (const pattern of blockedPatterns) {
        if (pathMatchesPattern(path, pattern)) {
          importantBlocked.push(page.finalUrl);
          break;
        }
      }
    }

    if (importantBlocked.length > 0) {
      issues.push({
        severity: "critical",
        title: "robots.txt blokuje důležité stránky",
        description: `${importantBlocked.length} dostupných stránek je blokováno v robots.txt. Vyhledávače je nebudou indexovat.`,
        affected_urls: importantBlocked,
        recommendation:
          "Zkontrolujte robots.txt a odstraňte Disallow pravidla pro stránky, které mají být indexovány.",
      });
    }
  }

  return issues;
}

// ── Helpers ──────────────────────────────────────────────────

function normalizeForCompare(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    // Remove trailing slash (except root)
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function isInSitemap(url: string, sitemapSet: Set<string>): boolean {
  return sitemapSet.has(normalizeForCompare(url));
}

function hasNoindex(page: { metaRobots: string | null; xRobotsTag: string | null }): boolean {
  const combined = `${page.metaRobots ?? ""} ${page.xRobotsTag ?? ""}`.toLowerCase();
  return combined.includes("noindex");
}

function extractDisallowedPaths(robotsTxt: string): string[] {
  const paths: string[] = [];
  let inUserAgentAll = false;

  for (const line of robotsTxt.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith("user-agent:")) {
      const agent = trimmed.slice("user-agent:".length).trim();
      inUserAgentAll = agent === "*";
    } else if (inUserAgentAll && trimmed.toLowerCase().startsWith("disallow:")) {
      const path = trimmed.slice("disallow:".length).trim();
      if (path) paths.push(path);
    }
  }

  return paths;
}

function pathMatchesPattern(path: string, pattern: string): boolean {
  // Simple prefix match (robots.txt Disallow is prefix-based)
  if (pattern.endsWith("*")) {
    return path.startsWith(pattern.slice(0, -1));
  }
  if (pattern.endsWith("$")) {
    return path === pattern.slice(0, -1);
  }
  return path.startsWith(pattern);
}
