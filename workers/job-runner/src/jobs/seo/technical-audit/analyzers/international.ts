import type { Issue } from "@agency-ops/shared";
import type { AnalyzerInput } from "./base";

/**
 * International analyzer — checks hreflang implementation:
 * reciprocity, targets, x-default, language codes.
 * Only runs if hreflang tags are detected.
 */
export function analyzeInternational(input: AnalyzerInput): Issue[] {
  const { pages } = input;
  const issues: Issue[] = [];

  const validPages = pages.filter((p) => p.statusCode === 200);

  // Only run if any page has hreflang
  const pagesWithHreflang = validPages.filter((p) => p.hreflang.length > 0);
  if (pagesWithHreflang.length === 0) return issues;

  // Build a map: URL → hreflang entries
  const hreflangMap = new Map<string, { lang: string; href: string }[]>();
  for (const page of pagesWithHreflang) {
    hreflangMap.set(normalizeUrl(page.finalUrl), page.hreflang);
  }

  // Also build pagesByUrl for target checking
  const pagesByUrl = new Map(
    pages.map((p) => [normalizeUrl(p.finalUrl), p]),
  );

  // ── Non-reciprocal hreflang → CRITICAL ──────────────────────
  const nonReciprocal: string[] = [];
  for (const page of pagesWithHreflang) {
    const pageNorm = normalizeUrl(page.finalUrl);

    for (const entry of page.hreflang) {
      const targetNorm = normalizeUrl(entry.href);
      if (targetNorm === pageNorm) continue; // Self-reference is fine

      // Check if target page has hreflang pointing back
      const targetHreflangs = hreflangMap.get(targetNorm);
      if (!targetHreflangs) {
        // Target page not in our crawl or has no hreflang
        nonReciprocal.push(page.finalUrl);
        break;
      }

      const pointsBack = targetHreflangs.some(
        (e) => normalizeUrl(e.href) === pageNorm,
      );
      if (!pointsBack) {
        nonReciprocal.push(page.finalUrl);
        break;
      }
    }
  }
  if (nonReciprocal.length > 0) {
    issues.push({
      severity: "critical",
      title: "Nereciproční hreflang tagy",
      description: `${nonReciprocal.length} stránek má hreflang tagy, které nesměřují zpět (nejsou reciproční). Google může nereciproční hreflang ignorovat.`,
      affected_urls: nonReciprocal,
      recommendation:
        "Zajistěte, aby každý hreflang tag měl odpovídající protějšek — stránka A odkazuje na B a B musí odkazovat zpět na A.",
    });
  }

  // ── Hreflang pointing to 404/redirect → CRITICAL ─────────────
  const badTargets: string[] = [];
  for (const page of pagesWithHreflang) {
    for (const entry of page.hreflang) {
      const targetNorm = normalizeUrl(entry.href);
      const targetPage = pagesByUrl.get(targetNorm);

      if (targetPage) {
        if (targetPage.statusCode !== 200 || targetPage.redirectChain.length > 0) {
          badTargets.push(page.finalUrl);
          break;
        }
      }
    }
  }
  if (badTargets.length > 0) {
    issues.push({
      severity: "critical",
      title: "Hreflang směřuje na 404 nebo redirect",
      description: `${badTargets.length} stránek má hreflang odkazující na stránku, která vrací chybu nebo přesměrovává. Vyhledávače tuto hreflang vazbu ignorují.`,
      affected_urls: badTargets,
      recommendation:
        "Aktualizujte hreflang tagy tak, aby směřovaly na finální, dostupné (200 OK) stránky bez přesměrování.",
    });
  }

  // ── Missing x-default → WARNING ──────────────────────────────
  const pagesWithoutXDefault: string[] = [];
  for (const page of pagesWithHreflang) {
    const hasXDefault = page.hreflang.some(
      (e) => e.lang.toLowerCase() === "x-default",
    );
    if (!hasXDefault) {
      pagesWithoutXDefault.push(page.finalUrl);
    }
  }
  if (pagesWithoutXDefault.length > 0) {
    issues.push({
      severity: "warning",
      title: "Chybějící hreflang x-default",
      description: `${pagesWithoutXDefault.length} stránek s hreflang tagy nemá x-default fallback. Bez x-default vyhledávače neví, kterou verzi zobrazit uživatelům mimo definované jazyky.`,
      affected_urls: pagesWithoutXDefault,
      recommendation:
        "Přidejte hreflang x-default tag odkazující na hlavní/defaultní jazykovou verzi stránky.",
    });
  }

  // ── Invalid language codes → WARNING ──────────────────────────
  const invalidLangPages: string[] = [];
  for (const page of pagesWithHreflang) {
    for (const entry of page.hreflang) {
      if (entry.lang.toLowerCase() === "x-default") continue;
      if (!isValidLangCode(entry.lang)) {
        invalidLangPages.push(page.finalUrl);
        break;
      }
    }
  }
  if (invalidLangPages.length > 0) {
    issues.push({
      severity: "warning",
      title: "Neplatné jazykové kódy v hreflang",
      description: `${invalidLangPages.length} stránek má hreflang tagy s neplatnými jazykovými kódy. Vyhledávače neplatné kódy ignorují.`,
      affected_urls: invalidLangPages,
      recommendation:
        "Používejte platné ISO 639-1 kódy jazyka (cs, en, de, ...) a volitelně ISO 3166-1 Alpha-2 kódy regionu (cs-CZ, en-US, de-AT, ...).",
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

/**
 * Validates hreflang language code format.
 * Accepts: "cs", "en", "cs-CZ", "en-US", "pt-BR", "zh-Hans", etc.
 */
function isValidLangCode(lang: string): boolean {
  // ISO 639-1 (2 chars) or ISO 639-1 + region/script
  // Pattern: xx or xx-YY or xx-Yyyy
  return /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(lang);
}
