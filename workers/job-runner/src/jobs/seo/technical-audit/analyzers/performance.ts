import type { Issue } from "@agency-ops/shared";
import type { AnalyzerInput } from "./base";

/**
 * Performance analyzer — checks Core Web Vitals (LCP, INP, CLS, TTFB)
 * and overall performance score from PageSpeed Insights data.
 */
export function analyzePerformance(input: AnalyzerInput): Issue[] {
  const { pageSpeedResults } = input;
  const issues: Issue[] = [];

  if (!pageSpeedResults || pageSpeedResults.length === 0) return issues;

  // Aggregate results per URL (prefer mobile, but check both)
  const byUrl = new Map<
    string,
    { lcp: number | null; inp: number | null; cls: number | null; ttfb: number | null; score: number | null; strategy: string }[]
  >();
  for (const r of pageSpeedResults) {
    const existing = byUrl.get(r.url);
    const entry = {
      lcp: r.lcp,
      inp: r.inp,
      cls: r.cls,
      ttfb: r.ttfb,
      score: r.performanceScore,
      strategy: r.strategy,
    };
    if (existing) {
      existing.push(entry);
    } else {
      byUrl.set(r.url, [entry]);
    }
  }

  // ── LCP ──────────────────────────────────────────────────────
  const lcpCritical: string[] = [];
  const lcpWarning: string[] = [];
  for (const [url, results] of byUrl) {
    for (const r of results) {
      if (r.lcp !== null && r.lcp > 4000) {
        lcpCritical.push(`${url} (${r.strategy}: ${(r.lcp / 1000).toFixed(1)}s)`);
      } else if (r.lcp !== null && r.lcp > 2500) {
        lcpWarning.push(`${url} (${r.strategy}: ${(r.lcp / 1000).toFixed(1)}s)`);
      }
    }
  }
  if (lcpCritical.length > 0) {
    issues.push({
      severity: "critical",
      title: "LCP > 4.0s — velmi pomalé načítání hlavního obsahu",
      description: `${lcpCritical.length} měření vykazuje Largest Contentful Paint nad 4 sekundy. Uživatelé pravděpodobně stránku opustí.`,
      affected_urls: lcpCritical,
      recommendation:
        "Optimalizujte hlavní obrázek (lazy load, WebP), minimalizujte render-blocking CSS/JS, použijte preload pro LCP element.",
    });
  }
  if (lcpWarning.length > 0) {
    issues.push({
      severity: "warning",
      title: "LCP > 2.5s — pomalé načítání hlavního obsahu",
      description: `${lcpWarning.length} měření má LCP mezi 2.5–4.0s. Google doporučuje LCP pod 2.5s.`,
      affected_urls: lcpWarning,
      recommendation:
        "Komprimujte obrázky, implementujte preload pro LCP element, optimalizujte server response time.",
    });
  }

  // ── INP / TBT ────────────────────────────────────────────────
  const inpCritical: string[] = [];
  const inpWarning: string[] = [];
  for (const [url, results] of byUrl) {
    for (const r of results) {
      if (r.inp !== null && r.inp > 500) {
        inpCritical.push(`${url} (${r.strategy}: ${Math.round(r.inp)}ms)`);
      } else if (r.inp !== null && r.inp > 200) {
        inpWarning.push(`${url} (${r.strategy}: ${Math.round(r.inp)}ms)`);
      }
    }
  }
  if (inpCritical.length > 0) {
    issues.push({
      severity: "critical",
      title: "INP > 500ms — velmi špatná interaktivita",
      description: `${inpCritical.length} měření vykazuje Interaction to Next Paint nad 500ms. Stránky reagují velmi pomalu na uživatelské akce.`,
      affected_urls: inpCritical,
      recommendation:
        "Rozdělte dlouhé úlohy (long tasks) na menší, odložte nepotřebný JavaScript, použijte web workers pro výpočetně náročné operace.",
    });
  }
  if (inpWarning.length > 0) {
    issues.push({
      severity: "warning",
      title: "INP > 200ms — pomalá interaktivita",
      description: `${inpWarning.length} měření má INP mezi 200–500ms. Google doporučuje INP pod 200ms.`,
      affected_urls: inpWarning,
      recommendation:
        "Minimalizujte JavaScript na stránce, odložte nenabídkový JS, optimalizujte event handlery.",
    });
  }

  // ── CLS ──────────────────────────────────────────────────────
  const clsCritical: string[] = [];
  const clsWarning: string[] = [];
  for (const [url, results] of byUrl) {
    for (const r of results) {
      if (r.cls !== null && r.cls > 0.25) {
        clsCritical.push(`${url} (${r.strategy}: ${r.cls.toFixed(3)})`);
      } else if (r.cls !== null && r.cls > 0.1) {
        clsWarning.push(`${url} (${r.strategy}: ${r.cls.toFixed(3)})`);
      }
    }
  }
  if (clsCritical.length > 0) {
    issues.push({
      severity: "critical",
      title: "CLS > 0.25 — silný layout shift",
      description: `${clsCritical.length} měření vykazuje Cumulative Layout Shift nad 0.25. Obsah stránky se výrazně posouvá při načítání.`,
      affected_urls: clsCritical,
      recommendation:
        "Nastavte explicitní rozměry (width/height) na obrázky a videa, vyhněte se dynamicky vkládaným prvkům nad existující obsah.",
    });
  }
  if (clsWarning.length > 0) {
    issues.push({
      severity: "warning",
      title: "CLS > 0.1 — mírný layout shift",
      description: `${clsWarning.length} měření má CLS mezi 0.1–0.25. Google doporučuje CLS pod 0.1.`,
      affected_urls: clsWarning,
      recommendation:
        "Rezervujte prostor pro obrázky, reklamy a embedded prvky. Používejte transform animace místo layout-triggering vlastností.",
    });
  }

  // ── TTFB ─────────────────────────────────────────────────────
  const ttfbWarning: string[] = [];
  const ttfbInfo: string[] = [];
  for (const [url, results] of byUrl) {
    for (const r of results) {
      if (r.ttfb !== null && r.ttfb > 600) {
        ttfbWarning.push(`${url} (${r.strategy}: ${Math.round(r.ttfb)}ms)`);
      } else if (r.ttfb !== null && r.ttfb > 200) {
        ttfbInfo.push(`${url} (${r.strategy}: ${Math.round(r.ttfb)}ms)`);
      }
    }
  }
  if (ttfbWarning.length > 0) {
    issues.push({
      severity: "warning",
      title: "TTFB > 600ms — pomalá odezva serveru",
      description: `${ttfbWarning.length} měření má Time to First Byte nad 600ms. Pomalý server zpožďuje celé načítání stránky.`,
      affected_urls: ttfbWarning,
      recommendation:
        "Optimalizujte serverové zpracování, implementujte CDN, zvažte server-side caching a databázovou optimalizaci.",
    });
  }
  if (ttfbInfo.length > 0) {
    issues.push({
      severity: "info",
      title: "TTFB > 200ms — odezva serveru nad ideálem",
      description: `${ttfbInfo.length} měření má TTFB mezi 200–600ms. Ideální TTFB je pod 200ms.`,
      affected_urls: ttfbInfo,
      recommendation:
        "Zvažte CDN, edge caching nebo optimalizaci databázových dotazů pro rychlejší server response.",
    });
  }

  // ── Performance score ─────────────────────────────────────────
  const scoreCritical: string[] = [];
  const scoreWarning: string[] = [];
  for (const [url, results] of byUrl) {
    for (const r of results) {
      if (r.score !== null && r.score < 50) {
        scoreCritical.push(`${url} (${r.strategy}: ${r.score}/100)`);
      } else if (r.score !== null && r.score < 90) {
        scoreWarning.push(`${url} (${r.strategy}: ${r.score}/100)`);
      }
    }
  }
  if (scoreCritical.length > 0) {
    issues.push({
      severity: "critical",
      title: "Performance score < 50",
      description: `${scoreCritical.length} měření má performance score pod 50. Stránky mají vážné problémy s výkonem.`,
      affected_urls: scoreCritical,
      recommendation:
        "Proveďte kompletní performance audit — optimalizujte obrázky, JavaScript, CSS a server response time.",
    });
  }
  if (scoreWarning.length > 0) {
    issues.push({
      severity: "warning",
      title: "Performance score < 90",
      description: `${scoreWarning.length} měření má performance score mezi 50–89. Stránky mají prostor pro zlepšení výkonu.`,
      affected_urls: scoreWarning,
      recommendation:
        "Identifikujte a optimalizujte největší bottlenecky pomocí Lighthouse — zaměřte se na LCP, INP a CLS.",
    });
  }

  return issues;
}
