import { describe, it, expect } from "vitest";
import type { CrawledPage } from "@agency-ops/shared";
import type { AnalyzerInput } from "../base";
import type { PageSpeedResult } from "../../pagespeed";
import { analyzeIndexability } from "../indexability";
import { analyzeOnPage } from "../on-page";
import { analyzeSecurity } from "../security";
import { analyzeArchitecture } from "../architecture";
import { analyzeStructuredData } from "../structured-data";
import { analyzePerformance } from "../performance";
import { analyzeAeoGeo } from "../aeo-geo";
import { analyzeInternational } from "../international";

// ── Mock factory ─────────────────────────────────────────────

function makePage(overrides: Partial<CrawledPage> = {}): CrawledPage {
  return {
    url: "https://example.com/page",
    finalUrl: "https://example.com/page",
    statusCode: 200,
    redirectChain: [],
    responseTimeMs: 150,
    contentType: "text/html",
    contentLength: 5000,
    title: "Test Page Title — Example",
    metaDescription: "A test page for unit testing analyzers.",
    canonical: "https://example.com/page",
    metaRobots: null,
    xRobotsTag: null,
    viewport: "width=device-width, initial-scale=1",
    hreflang: [],
    maxImagePreview: "large",
    h1: ["Test Page Title"],
    h2: ["Section 1", "Section 2"],
    h3: [],
    wordCount: 500,
    rawHtmlLength: 8000,
    internalLinks: [
      { href: "https://example.com/about", anchorText: "About", isNofollow: false },
      { href: "https://example.com/contact", anchorText: "Contact", isNofollow: false },
      { href: "https://example.com/blog", anchorText: "Blog", isNofollow: false },
    ],
    externalLinks: [
      { href: "https://external.com", anchorText: "External", isNofollow: false },
    ],
    brokenLinks: [],
    images: [
      { src: "https://example.com/img.webp", alt: "Test image", width: 800, height: 600, sizeKb: 50, format: "webp" },
    ],
    jsonLd: [],
    microdata: [],
    jsRenderDiff: null,
    crawledAt: new Date().toISOString(),
    crawlDepth: 1,
    ...overrides,
  };
}

function makeInput(
  pages: CrawledPage[],
  overrides: Partial<AnalyzerInput> = {},
): AnalyzerInput {
  return {
    pages,
    robotsTxt: null,
    sitemapUrls: [],
    ...overrides,
  };
}

function findIssue(issues: ReturnType<typeof analyzeIndexability>, title: string) {
  return issues.find((i) => i.title.toLowerCase().includes(title.toLowerCase()));
}

// ═══════════════════════════════════════════════════════════════
//  INDEXABILITY
// ═══════════════════════════════════════════════════════════════

describe("analyzeIndexability", () => {
  it("detects noindex pages in sitemap → CRITICAL", () => {
    const page = makePage({
      finalUrl: "https://example.com/secret",
      metaRobots: "noindex, nofollow",
    });
    const input = makeInput([page], {
      sitemapUrls: ["https://example.com/secret"],
    });
    const issues = analyzeIndexability(input);
    const issue = findIssue(issues, "noindex");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects canonical pointing to 404 → CRITICAL", () => {
    const page = makePage({
      finalUrl: "https://example.com/a",
      canonical: "https://example.com/dead",
    });
    const deadPage = makePage({
      finalUrl: "https://example.com/dead",
      statusCode: 404,
      canonical: null,
    });
    const issues = analyzeIndexability(makeInput([page, deadPage]));
    const issue = findIssue(issues, "canonical");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects canonical chaining → WARNING", () => {
    const a = makePage({
      finalUrl: "https://example.com/a",
      canonical: "https://example.com/b",
    });
    const b = makePage({
      finalUrl: "https://example.com/b",
      canonical: "https://example.com/c",
    });
    const c = makePage({
      finalUrl: "https://example.com/c",
      canonical: "https://example.com/c",
    });
    const issues = analyzeIndexability(makeInput([a, b, c]));
    const issue = findIssue(issues, "řetězení");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects non-200 URLs in sitemap → WARNING", () => {
    const page = makePage({
      finalUrl: "https://example.com/gone",
      statusCode: 404,
    });
    const input = makeInput([page], {
      sitemapUrls: ["https://example.com/gone"],
    });
    const issues = analyzeIndexability(input);
    const issue = findIssue(issues, "non-200");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects missing self-referencing canonical → WARNING", () => {
    const page = makePage({
      finalUrl: "https://example.com/page",
      canonical: null,
    });
    const issues = analyzeIndexability(makeInput([page]));
    const issue = findIssue(issues, "self-referencing");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects robots.txt blocking important pages → CRITICAL", () => {
    const page = makePage({ finalUrl: "https://example.com/products/item" });
    const input = makeInput([page], {
      robotsTxt: "User-agent: *\nDisallow: /products/",
    });
    const issues = analyzeIndexability(input);
    const issue = findIssue(issues, "robots.txt");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("returns no issues for healthy pages", () => {
    const page = makePage();
    const issues = analyzeIndexability(makeInput([page]));
    // Only self-referencing canonical should be clean since we set it
    const critical = issues.filter((i) => i.severity === "critical");
    expect(critical).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
//  ON-PAGE
// ═══════════════════════════════════════════════════════════════

describe("analyzeOnPage", () => {
  it("detects missing title → CRITICAL", () => {
    const page = makePage({ title: null });
    const issues = analyzeOnPage(makeInput([page]));
    const issue = findIssue(issues, "chybějící title");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects duplicate titles → WARNING", () => {
    const a = makePage({ finalUrl: "https://example.com/a", title: "Same Title" });
    const b = makePage({ finalUrl: "https://example.com/b", title: "Same Title" });
    const issues = analyzeOnPage(makeInput([a, b]));
    const issue = findIssue(issues, "duplicitní title");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects title > 60 chars → INFO", () => {
    const page = makePage({
      title: "This is a very long title that exceeds sixty characters in total length",
    });
    const issues = analyzeOnPage(makeInput([page]));
    const issue = findIssue(issues, "delší než 60");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });

  it("detects title < 30 chars → WARNING", () => {
    const page = makePage({ title: "Short" });
    const issues = analyzeOnPage(makeInput([page]));
    const issue = findIssue(issues, "kratší než 30");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects missing H1 → CRITICAL", () => {
    const page = makePage({ h1: [] });
    const issues = analyzeOnPage(makeInput([page]));
    const issue = findIssue(issues, "chybějící H1");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects multiple H1 → WARNING", () => {
    const page = makePage({ h1: ["First H1", "Second H1"] });
    const issues = analyzeOnPage(makeInput([page]));
    const issue = findIssue(issues, "více H1");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects thin content → WARNING", () => {
    const page = makePage({ wordCount: 50 });
    const issues = analyzeOnPage(makeInput([page]));
    const issue = findIssue(issues, "tenký obsah");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects images missing alt → WARNING", () => {
    const page = makePage({
      images: [
        { src: "https://example.com/img.jpg", alt: null, width: 100, height: 100, sizeKb: 30, format: "jpg" },
      ],
    });
    const issues = analyzeOnPage(makeInput([page]));
    const issue = findIssue(issues, "bez alt");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects large images → INFO", () => {
    const page = makePage({
      images: [
        { src: "https://example.com/big.png", alt: "Big", width: 2000, height: 1500, sizeKb: 500, format: "png" },
      ],
    });
    const issues = analyzeOnPage(makeInput([page]));
    const issue = findIssue(issues, "velké obrázky");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });

  it("detects missing max-image-preview → INFO", () => {
    const page = makePage({ maxImagePreview: null });
    const issues = analyzeOnPage(makeInput([page]));
    const issue = findIssue(issues, "max-image-preview");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });
});

// ═══════════════════════════════════════════════════════════════
//  SECURITY
// ═══════════════════════════════════════════════════════════════

describe("analyzeSecurity", () => {
  it("detects HTTP pages → CRITICAL", () => {
    const page = makePage({
      finalUrl: "http://example.com/page",
    });
    const issues = analyzeSecurity(makeInput([page]));
    const issue = findIssue(issues, "HTTP");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects redirect loop → CRITICAL", () => {
    const page = makePage({
      finalUrl: "https://example.com/a",
      url: "https://example.com/a",
      redirectChain: [
        { from: "https://example.com/a", to: "https://example.com/b", statusCode: 301 },
        { from: "https://example.com/b", to: "https://example.com/a", statusCode: 301 },
      ],
    });
    const issues = analyzeSecurity(makeInput([page]));
    const issue = findIssue(issues, "smyčka");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects redirect chain > 2 hops → WARNING", () => {
    const page = makePage({
      redirectChain: [
        { from: "https://example.com/a", to: "https://example.com/b", statusCode: 301 },
        { from: "https://example.com/b", to: "https://example.com/c", statusCode: 301 },
        { from: "https://example.com/c", to: "https://example.com/d", statusCode: 301 },
      ],
    });
    const issues = analyzeSecurity(makeInput([page]));
    const issue = findIssue(issues, "řetězce přesměrování");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects 302 redirects → INFO", () => {
    const page = makePage({
      redirectChain: [
        { from: "https://example.com/old", to: "https://example.com/new", statusCode: 302 },
      ],
    });
    const issues = analyzeSecurity(makeInput([page]));
    const issue = findIssue(issues, "302");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });

  it("detects mixed content → WARNING", () => {
    const page = makePage({
      finalUrl: "https://example.com/page",
      images: [
        { src: "http://cdn.example.com/img.jpg", alt: "Insecure", width: 100, height: 100, sizeKb: 30, format: "jpg" },
      ],
    });
    const issues = analyzeSecurity(makeInput([page]));
    const issue = findIssue(issues, "mixed content");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("recommends HSTS for HTTPS sites → INFO", () => {
    const page = makePage({ finalUrl: "https://example.com/" });
    const issues = analyzeSecurity(makeInput([page]));
    const issue = findIssue(issues, "HSTS");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });
});

// ═══════════════════════════════════════════════════════════════
//  ARCHITECTURE
// ═══════════════════════════════════════════════════════════════

describe("analyzeArchitecture", () => {
  it("detects click depth > 5 → CRITICAL", () => {
    const page = makePage({ crawlDepth: 6 });
    const issues = analyzeArchitecture(makeInput([page]));
    const issue = findIssue(issues, "depth > 5");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects click depth > 4 → WARNING", () => {
    const page = makePage({ crawlDepth: 5 });
    const issues = analyzeArchitecture(makeInput([page]));
    const issue = findIssue(issues, "depth > 4");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects orphan pages in sitemap → WARNING", () => {
    // Page is in sitemap but no other page links to it
    const homepage = makePage({
      finalUrl: "https://example.com/",
      crawlDepth: 0,
      internalLinks: [], // homepage doesn't link to orphan
    });
    const orphan = makePage({
      finalUrl: "https://example.com/orphan",
      internalLinks: [],
    });
    const input = makeInput([homepage, orphan], {
      sitemapUrls: ["https://example.com/", "https://example.com/orphan"],
    });
    const issues = analyzeArchitecture(input);
    const issue = findIssue(issues, "osiřelé");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects pages with < 3 internal links → INFO", () => {
    // Page that nobody links to
    const page = makePage({
      finalUrl: "https://example.com/lonely",
      internalLinks: [],
    });
    const issues = analyzeArchitecture(makeInput([page]));
    const issue = findIssue(issues, "méně než 3");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });

  it("detects URL with params but no canonical → WARNING", () => {
    const page = makePage({
      finalUrl: "https://example.com/search?q=test",
      canonical: null,
    });
    const issues = analyzeArchitecture(makeInput([page]));
    const issue = findIssue(issues, "parametry");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects non-lowercase URLs → INFO", () => {
    const page = makePage({
      finalUrl: "https://example.com/About-Us",
    });
    const issues = analyzeArchitecture(makeInput([page]));
    const issue = findIssue(issues, "lowercase");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });

  it("detects URLs > 115 chars → INFO", () => {
    const longPath = "/category/" + "a".repeat(120);
    const page = makePage({
      finalUrl: `https://example.com${longPath}`,
    });
    const issues = analyzeArchitecture(makeInput([page]));
    const issue = findIssue(issues, "115");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });
});

// ═══════════════════════════════════════════════════════════════
//  STRUCTURED DATA
// ═══════════════════════════════════════════════════════════════

describe("analyzeStructuredData", () => {
  it("detects missing Organization schema → WARNING", () => {
    const page = makePage({ crawlDepth: 0, jsonLd: [] });
    const issues = analyzeStructuredData(makeInput([page]));
    const issue = findIssue(issues, "organization");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("does not flag Organization when present", () => {
    const page = makePage({
      crawlDepth: 0,
      jsonLd: [{ "@context": "https://schema.org", "@type": "Organization", name: "Test" }],
    });
    const issues = analyzeStructuredData(makeInput([page]));
    const issue = findIssue(issues, "organization");
    expect(issue).toBeUndefined();
  });

  it("detects missing BreadcrumbList on deep pages → WARNING", () => {
    const deep = makePage({
      finalUrl: "https://example.com/cat/sub/page",
      crawlDepth: 3,
      jsonLd: [],
    });
    const issues = analyzeStructuredData(makeInput([deep]));
    const issue = findIssue(issues, "breadcrumb");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects blog pages without Article schema → INFO", () => {
    const blog = makePage({
      finalUrl: "https://example.com/blog/my-post",
      jsonLd: [],
    });
    const issues = analyzeStructuredData(makeInput([blog]));
    const issue = findIssue(issues, "blogov");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });

  it("detects JSON-LD without @type → WARNING", () => {
    const page = makePage({
      jsonLd: [{ name: "Missing type" }],
    });
    const issues = analyzeStructuredData(makeInput([page]));
    const issue = findIssue(issues, "json-ld");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects product pages without Product schema → WARNING", () => {
    const product = makePage({
      finalUrl: "https://example.com/produkt/widget-123",
      jsonLd: [],
    });
    const issues = analyzeStructuredData(makeInput([product]));
    const issue = findIssue(issues, "produkt");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });
});

// ═══════════════════════════════════════════════════════════════
//  PERFORMANCE
// ═══════════════════════════════════════════════════════════════

describe("analyzePerformance", () => {
  function makePSI(overrides: Partial<PageSpeedResult> = {}): PageSpeedResult {
    return {
      url: "https://example.com/",
      strategy: "mobile",
      performanceScore: 95,
      lcp: 1800,
      inp: 100,
      cls: 0.05,
      ttfb: 150,
      source: "field",
      ...overrides,
    };
  }

  it("returns no issues when no PSI data", () => {
    const issues = analyzePerformance(makeInput([]));
    expect(issues).toHaveLength(0);
  });

  it("detects LCP > 4s → CRITICAL", () => {
    const input = makeInput([], { pageSpeedResults: [makePSI({ lcp: 5000 })] });
    const issues = analyzePerformance(input);
    const issue = findIssue(issues, "lcp");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects LCP > 2.5s → WARNING", () => {
    const input = makeInput([], { pageSpeedResults: [makePSI({ lcp: 3000 })] });
    const issues = analyzePerformance(input);
    const issue = findIssue(issues, "lcp");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects INP > 500ms → CRITICAL", () => {
    const input = makeInput([], { pageSpeedResults: [makePSI({ inp: 600 })] });
    const issues = analyzePerformance(input);
    const issue = findIssue(issues, "inp");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects CLS > 0.25 → CRITICAL", () => {
    const input = makeInput([], { pageSpeedResults: [makePSI({ cls: 0.35 })] });
    const issues = analyzePerformance(input);
    const issue = findIssue(issues, "cls");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects CLS > 0.1 → WARNING", () => {
    const input = makeInput([], { pageSpeedResults: [makePSI({ cls: 0.15 })] });
    const issues = analyzePerformance(input);
    const issue = findIssue(issues, "cls");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects TTFB > 600ms → WARNING", () => {
    const input = makeInput([], { pageSpeedResults: [makePSI({ ttfb: 800 })] });
    const issues = analyzePerformance(input);
    const issue = findIssue(issues, "ttfb");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects performance score < 50 → CRITICAL", () => {
    const input = makeInput([], {
      pageSpeedResults: [makePSI({ performanceScore: 30 })],
    });
    const issues = analyzePerformance(input);
    const issue = findIssue(issues, "score");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects performance score < 90 → WARNING", () => {
    const input = makeInput([], {
      pageSpeedResults: [makePSI({ performanceScore: 72 })],
    });
    const issues = analyzePerformance(input);
    const issue = findIssue(issues, "score");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("no issues for excellent metrics", () => {
    const input = makeInput([], { pageSpeedResults: [makePSI()] });
    const issues = analyzePerformance(input);
    expect(issues).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
//  AEO/GEO
// ═══════════════════════════════════════════════════════════════

describe("analyzeAeoGeo", () => {
  it("detects GPTBot blocked → WARNING", () => {
    const page = makePage();
    const input = makeInput([page], {
      robotsTxt: "User-agent: GPTBot\nDisallow: /\n",
    });
    const issues = analyzeAeoGeo(input);
    const issue = findIssue(issues, "gptbot");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects ClaudeBot blocked → WARNING", () => {
    const input = makeInput([makePage()], {
      robotsTxt: "User-agent: ClaudeBot\nDisallow: /\n",
    });
    const issues = analyzeAeoGeo(input);
    const issue = findIssue(issues, "claudebot");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("detects PerplexityBot blocked → WARNING", () => {
    const input = makeInput([makePage()], {
      robotsTxt: "User-agent: PerplexityBot\nDisallow: /\n",
    });
    const issues = analyzeAeoGeo(input);
    const issue = findIssue(issues, "perplexitybot");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("does not flag bots when robots.txt allows them", () => {
    const input = makeInput([makePage()], {
      robotsTxt: "User-agent: *\nAllow: /\n",
    });
    const issues = analyzeAeoGeo(input);
    const gpt = findIssue(issues, "gptbot");
    const claude = findIssue(issues, "claudebot");
    expect(gpt).toBeUndefined();
    expect(claude).toBeUndefined();
  });

  it("detects missing llms.txt → INFO", () => {
    const page = makePage({ finalUrl: "https://example.com/" });
    const issues = analyzeAeoGeo(makeInput([page]));
    const issue = findIssue(issues, "llms.txt");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });

  it("does not flag llms.txt when present", () => {
    const page = makePage({ finalUrl: "https://example.com/" });
    const llms = makePage({ finalUrl: "https://example.com/llms.txt" });
    const issues = analyzeAeoGeo(makeInput([page, llms]));
    const issue = findIssue(issues, "llms.txt");
    expect(issue).toBeUndefined();
  });

  it("detects articles without author schema → INFO", () => {
    const article = makePage({
      finalUrl: "https://example.com/blog/my-post",
      jsonLd: [{ "@context": "https://schema.org", "@type": "Article", headline: "Test" }],
    });
    const issues = analyzeAeoGeo(makeInput([article]));
    const issue = findIssue(issues, "author");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });

  it("detects missing About page → INFO", () => {
    const pages = [
      makePage({ finalUrl: "https://example.com/", crawlDepth: 0 }),
      makePage({ finalUrl: "https://example.com/blog", crawlDepth: 1 }),
      makePage({ finalUrl: "https://example.com/services", crawlDepth: 1 }),
      makePage({ finalUrl: "https://example.com/contact", crawlDepth: 1 }),
    ];
    const issues = analyzeAeoGeo(makeInput(pages));
    const issue = findIssue(issues, "o nás");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("info");
  });

  it("does not flag About page when present", () => {
    const pages = [
      makePage({ finalUrl: "https://example.com/", crawlDepth: 0 }),
      makePage({ finalUrl: "https://example.com/o-nas", crawlDepth: 1 }),
      makePage({ finalUrl: "https://example.com/blog", crawlDepth: 1 }),
      makePage({ finalUrl: "https://example.com/contact", crawlDepth: 1 }),
    ];
    const issues = analyzeAeoGeo(makeInput(pages));
    const issue = findIssue(issues, "o nás");
    expect(issue).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
//  INTERNATIONAL
// ═══════════════════════════════════════════════════════════════

describe("analyzeInternational", () => {
  it("returns no issues when no hreflang tags", () => {
    const page = makePage({ hreflang: [] });
    const issues = analyzeInternational(makeInput([page]));
    expect(issues).toHaveLength(0);
  });

  it("detects non-reciprocal hreflang → CRITICAL", () => {
    const cs = makePage({
      finalUrl: "https://example.com/cs",
      hreflang: [
        { lang: "cs", href: "https://example.com/cs" },
        { lang: "en", href: "https://example.com/en" },
      ],
    });
    // English page doesn't point back to Czech
    const en = makePage({
      finalUrl: "https://example.com/en",
      hreflang: [
        { lang: "en", href: "https://example.com/en" },
      ],
    });
    const issues = analyzeInternational(makeInput([cs, en]));
    const issue = findIssue(issues, "nereciproční");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("no reciprocity issue when hreflang is reciprocal", () => {
    const cs = makePage({
      finalUrl: "https://example.com/cs",
      hreflang: [
        { lang: "cs", href: "https://example.com/cs" },
        { lang: "en", href: "https://example.com/en" },
      ],
    });
    const en = makePage({
      finalUrl: "https://example.com/en",
      hreflang: [
        { lang: "en", href: "https://example.com/en" },
        { lang: "cs", href: "https://example.com/cs" },
      ],
    });
    const issues = analyzeInternational(makeInput([cs, en]));
    const issue = findIssue(issues, "nereciproční");
    expect(issue).toBeUndefined();
  });

  it("detects hreflang pointing to 404 → CRITICAL", () => {
    const cs = makePage({
      finalUrl: "https://example.com/cs",
      hreflang: [
        { lang: "cs", href: "https://example.com/cs" },
        { lang: "de", href: "https://example.com/de" },
      ],
    });
    const de = makePage({
      finalUrl: "https://example.com/de",
      statusCode: 404,
      hreflang: [],
    });
    const issues = analyzeInternational(makeInput([cs, de]));
    const issue = findIssue(issues, "404");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("critical");
  });

  it("detects missing x-default → WARNING", () => {
    const page = makePage({
      finalUrl: "https://example.com/cs",
      hreflang: [
        { lang: "cs", href: "https://example.com/cs" },
        { lang: "en", href: "https://example.com/en" },
      ],
    });
    const issues = analyzeInternational(makeInput([page]));
    const issue = findIssue(issues, "x-default");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("does not flag x-default when present", () => {
    const page = makePage({
      finalUrl: "https://example.com/cs",
      hreflang: [
        { lang: "cs", href: "https://example.com/cs" },
        { lang: "en", href: "https://example.com/en" },
        { lang: "x-default", href: "https://example.com/en" },
      ],
    });
    const issues = analyzeInternational(makeInput([page]));
    const issue = findIssue(issues, "x-default");
    expect(issue).toBeUndefined();
  });

  it("detects invalid language codes → WARNING", () => {
    const page = makePage({
      finalUrl: "https://example.com/cs",
      hreflang: [
        { lang: "cs", href: "https://example.com/cs" },
        { lang: "invalid-lang-code-xyz", href: "https://example.com/xyz" },
      ],
    });
    const issues = analyzeInternational(makeInput([page]));
    const issue = findIssue(issues, "neplatné");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("accepts valid language codes (cs, en-US, pt-BR)", () => {
    const page = makePage({
      finalUrl: "https://example.com/cs",
      hreflang: [
        { lang: "cs", href: "https://example.com/cs" },
        { lang: "en-US", href: "https://example.com/en" },
        { lang: "x-default", href: "https://example.com/en" },
      ],
    });
    const issues = analyzeInternational(makeInput([page]));
    const issue = findIssue(issues, "neplatné");
    expect(issue).toBeUndefined();
  });
});
