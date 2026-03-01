import type { Issue } from "@agency-ops/shared";
import type { AnalyzerInput } from "./base";

/**
 * Security analyzer — checks HTTPS, mixed content, HSTS,
 * redirect chains/loops, and redirect status codes.
 */
export function analyzeSecurity(input: AnalyzerInput): Issue[] {
  const { pages } = input;
  const issues: Issue[] = [];

  // ── HTTP (not HTTPS) → CRITICAL ───────────────────────────
  const httpPages = pages.filter((p) => {
    try {
      return new URL(p.finalUrl).protocol === "http:";
    } catch {
      return false;
    }
  });
  if (httpPages.length > 0) {
    issues.push({
      severity: "critical",
      title: "Stránky dostupné přes HTTP (bez HTTPS)",
      description: `${httpPages.length} stránek je dostupných přes nezabezpečený protokol HTTP. Google penalizuje HTTP stránky a prohlížeče zobrazují varování.`,
      affected_urls: httpPages.map((p) => p.finalUrl),
      recommendation:
        "Nasaďte HTTPS certifikát a nastavte přesměrování ze všech HTTP URL na HTTPS.",
    });
  }

  // ── Mixed content → WARNING ───────────────────────────────
  const mixedContentPages: string[] = [];
  for (const page of pages) {
    if (page.statusCode !== 200) continue;

    try {
      const pageProtocol = new URL(page.finalUrl).protocol;
      if (pageProtocol !== "https:") continue;
    } catch {
      continue;
    }

    // Check images loaded over HTTP on HTTPS page
    const hasHttpResource = page.images.some((img) => {
      try {
        return new URL(img.src).protocol === "http:";
      } catch {
        return false;
      }
    });

    // Check links to HTTP resources (scripts/stylesheets detected as external links)
    const hasHttpLink = page.externalLinks.some((link) => {
      try {
        return new URL(link.href).protocol === "http:";
      } catch {
        return false;
      }
    });

    if (hasHttpResource || hasHttpLink) {
      mixedContentPages.push(page.finalUrl);
    }
  }
  if (mixedContentPages.length > 0) {
    issues.push({
      severity: "warning",
      title: "Mixed content (HTTP resources na HTTPS stránce)",
      description: `${mixedContentPages.length} HTTPS stránek načítá zdroje přes nezabezpečený HTTP. Prohlížeče mohou tyto zdroje blokovat.`,
      affected_urls: mixedContentPages,
      recommendation:
        "Aktualizujte všechny URL zdrojů (obrázky, skripty, CSS) na HTTPS verze.",
    });
  }

  // ── Missing HSTS → INFO ───────────────────────────────────
  // Note: We can't directly check HSTS headers from crawl data (not in CrawledPage).
  // We check if any HTTPS page was crawled — if so, we recommend HSTS.
  const httpsPages = pages.filter((p) => {
    try {
      return new URL(p.finalUrl).protocol === "https:" && p.statusCode === 200;
    } catch {
      return false;
    }
  });
  if (httpsPages.length > 0) {
    // We flag this as a general recommendation since we can't verify HSTS from crawl data
    issues.push({
      severity: "info",
      title: "Ověřte HSTS header",
      description:
        "Strict-Transport-Security (HSTS) header zajistí, že prohlížeče budou vždy používat HTTPS. Nelze ověřit z crawl dat — zkontrolujte manuálně.",
      affected_urls: [httpsPages[0]?.finalUrl ?? ""].filter(Boolean),
      recommendation:
        "Přidejte header Strict-Transport-Security: max-age=31536000; includeSubDomains na server.",
    });
  }

  // ── Redirect chain > 2 hops → WARNING ─────────────────────
  const longChains = pages.filter((p) => p.redirectChain.length > 2);
  if (longChains.length > 0) {
    issues.push({
      severity: "warning",
      title: "Dlouhé řetězce přesměrování (> 2 hopy)",
      description: `${longChains.length} URL má více než 2 přesměrování v řadě. Dlouhé řetězce zpomalují načítání a plýtvají crawl budgetem.`,
      affected_urls: longChains.map((p) => p.url),
      recommendation:
        "Zkraťte přesměrovací řetězce — každá URL by měla směřovat přímo na finální cíl jedním přesměrováním.",
    });
  }

  // ── Redirect loop → CRITICAL ──────────────────────────────
  const redirectLoops: string[] = [];
  for (const page of pages) {
    if (page.redirectChain.length === 0) continue;

    const visitedInChain = new Set<string>();
    let hasLoop = false;
    for (const hop of page.redirectChain) {
      if (visitedInChain.has(hop.to)) {
        hasLoop = true;
        break;
      }
      visitedInChain.add(hop.from);
    }
    // Also check if final URL equals original (loop back)
    if (page.redirectChain.length > 0 && page.finalUrl === page.url && page.redirectChain.length > 1) {
      hasLoop = true;
    }

    if (hasLoop) {
      redirectLoops.push(page.url);
    }
  }
  if (redirectLoops.length > 0) {
    issues.push({
      severity: "critical",
      title: "Smyčka přesměrování (redirect loop)",
      description: `${redirectLoops.length} URL vytváří smyčku přesměrování. Stránka se nikdy nenačte a vyhledávače ji nemohou indexovat.`,
      affected_urls: redirectLoops,
      recommendation:
        "Opravte přesměrovací pravidla na serveru tak, aby nevznikaly cykly.",
    });
  }

  // ── 302 where 301 expected → INFO ─────────────────────────
  const using302: string[] = [];
  for (const page of pages) {
    for (const hop of page.redirectChain) {
      if (hop.statusCode === 302) {
        using302.push(page.url);
        break;
      }
    }
  }
  if (using302.length > 0) {
    issues.push({
      severity: "info",
      title: "Použití 302 místo 301 přesměrování",
      description: `${using302.length} URL používá dočasné přesměrování (302) místo trvalého (301). Vyhledávače nemusí přenést link equity na cílovou URL.`,
      affected_urls: using302,
      recommendation:
        "Pokud je přesměrování trvalé, změňte status code z 302 na 301 pro správný přenos link juice.",
    });
  }

  return issues;
}
