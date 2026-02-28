# MVP 1.1: Technická SEO Analýza – Automatizační Blueprint

## Vstupní dokument: seo-learning-guide-v2.docx (14 fází, Macro Consulting)

---

## 1. Mapování fází na automatizaci

### Legenda automatizovatelnosti
- 🟢 **PLNĚ AUTOMATIZOVATELNÉ** – robot zvládne bez lidského zásahu
- 🟡 **ČÁSTEČNĚ AUTOMATIZOVATELNÉ** – robot sbírá data, AI interpretuje, ale vyžaduje kontext
- 🔴 **MANUÁLNÍ / VYŽADUJE PŘÍSTUPY** – nelze automatizovat bez externích credentials
- ⚪ **MIMO MVP 1.1** – odloženo na pozdější verzi

### Přehled fází

| Fáze | Název | Auto | MVP 1.1 | Náhrada za Screaming Frog |
|------|-------|------|---------|--------------------------|
| 0 | Příprava a sběr kontextu | 🟡 | ✅ Částečně | Wappalyzer API + site: query |
| 1 | Crawl webu | 🟢 | ✅ | Playwright crawler + cheerio |
| 2 | Indexace a viditelnost | 🟡 | ✅ Bez GSC | Crawl data + robots.txt + sitemap parse |
| 3 | Architektura a interní linking | 🟢 | ✅ | Crawl graph analysis |
| 4 | Rychlost a výkon (CWV) | 🟢 | ✅ | PageSpeed Insights API (free) |
| 5 | Mobilní použitelnost | 🟢 | ✅ | PSI API (mobile strategy) + viewport check |
| 6 | HTTPS a bezpečnost | 🟢 | ✅ | Crawl data (SSL, redirects, mixed content) |
| 7 | Strukturovaná data | 🟢 | ✅ | HTML parse → JSON-LD/Microdata extraction |
| 8 | Obsah a on-page prvky | 🟢 | ✅ | Crawl data (titles, metas, H1, images, word count) |
| 9 | JavaScript SEO | 🟡 | ✅ Základní | Playwright: raw HTML vs rendered DOM diff |
| 10 | Crawl Budget a log analýza | 🔴 | ⚪ | Vyžaduje server logy – mimo MVP |
| 11 | AEO a GEO | 🟡 | ✅ Částečně | robots.txt AI bot check + llms.txt + schema check |
| 12 | Mezinárodní SEO | 🟢 | ✅ Pokud hreflang | Crawl data (hreflang parsing) |
| 13 | Kompilace a prioritizace | 🟡 | ✅ | AI (Claude) generuje Impact/Effort + report |

---

## 2. Technická architektura Job pipeline

### Celkový flow

```
User klikne "Spustit analýzu"
    │
    ▼
[API Route] Vytvoří job record v Supabase (status: queued)
    │
    ▼
[Railway Worker] Pickup job z queue
    │
    ▼
┌─────────────────────────────────────────────────┐
│  STEP 1: PŘÍPRAVA (Fáze 0)                      │
│  - Resolve domain → base URL                    │
│  - Fetch robots.txt → parse rules               │
│  - Fetch sitemap.xml → collect known URLs        │
│  - Tech stack detection (Wappalyzer-like)        │
│  - Progress: 5%                                  │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  STEP 2: CRAWL (Fáze 1)                         │
│  - BFS crawl z base URL (Playwright + cheerio)   │
│  - Respektuj robots.txt                          │
│  - Max depth = user config (default 3)           │
│  - Max pages = user config (default 100)         │
│  - Max 5 concurrent requests (politeness)        │
│  - JS rendering pro sample (každá 10. stránka)   │
│  - Collect per page:                             │
│    - URL, status code, redirect chain            │
│    - Title, meta description, H1-H6             │
│    - Canonical, meta robots, hreflang            │
│    - Internal/external links + anchors           │
│    - Images (src, alt, size)                     │
│    - Word count, JSON-LD structured data         │
│    - Response time                               │
│  - Progress: 5% → 50% (incremental)             │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  STEP 3: PAGESPEED (Fáze 4+5)                   │
│  - PageSpeed Insights API pro sample stránek     │
│  - Homepage + top 5 nejdůležitějších (by inlinks)│
│  - Mobile + Desktop strategy                     │
│  - LCP, INP, CLS, TTFB, performance score       │
│  - Progress: 50% → 60%                          │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  STEP 4: ANALYSIS (Fáze 2,3,6,7,8,9,11,12)     │
│  - Analyzéry běží paralelně nad crawl daty:      │
│                                                  │
│  [indexability]    robots.txt conflicts,          │
│                    noindex vs sitemap,            │
│                    canonical issues               │
│                                                  │
│  [architecture]   click depth, orphan detection, │
│                    internal link distribution,    │
│                    URL structure quality          │
│                                                  │
│  [security]       HTTPS, mixed content,          │
│                    redirect chains/loops,         │
│                    HSTS header                    │
│                                                  │
│  [structured-data] JSON-LD extraction,           │
│                     schema type coverage,         │
│                     validation errors             │
│                                                  │
│  [on-page]        titles, metas, H1 structure,   │
│                    duplicate content detection,   │
│                    thin content, image issues     │
│                                                  │
│  [js-seo]         raw vs rendered DOM diff        │
│                    (for JS-heavy sites)           │
│                                                  │
│  [aeo-geo]        AI bot access in robots.txt,   │
│                    llms.txt presence,             │
│                    answer-first format score,     │
│                    E-E-A-T signals check          │
│                                                  │
│  [international]  hreflang validation             │
│                    (if detected)                  │
│                                                  │
│  - Progress: 60% → 80%                          │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  STEP 5: AI COMPILATION (Fáze 13)               │
│  - Claude Sonnet dostane:                        │
│    - Všechny issues ze všech analyzérů           │
│    - Crawl statistiky                            │
│    - User custom instructions / client context   │
│  - Generuje:                                     │
│    - Executive summary                           │
│    - Impact/Effort scoring pro každý issue       │
│    - Quadrant assignment (Quick Win / Major /    │
│      Fill-in / Time Waster)                      │
│    - Prioritizovaný akční plán                   │
│    - AI recommendations text                     │
│  - Progress: 80% → 95%                          │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  STEP 6: REPORT ASSEMBLY                         │
│  - Compile final TechnicalAuditResult JSON       │
│  - Store in Supabase jobs.result                 │
│  - Status: completed                             │
│  - Progress: 100%                                │
└─────────────────────────────────────────────────┘
```

### Časový odhad (100 stránek, depth 3)

| Step | Odhadovaný čas | Bottleneck |
|------|----------------|------------|
| Preparation | 5-10s | Sitemap fetch |
| Crawl | 3-8 min | Politeness delay (5 concurrent, 200ms gap) |
| PageSpeed | 30-60s | API rate limit (1 req/s) |
| Analysis | 10-30s | CPU-bound, paralelní |
| AI Compilation | 15-30s | Claude API latency |
| Report Assembly | <5s | DB write |
| **TOTAL** | **~5-10 min** | Crawl je dominantní |

---

## 3. Detailní specifikace analyzérů

### 3.1 Crawler (Step 2) – jádro systému

**Technologie:** Playwright (headless Chromium) + cheerio (fast HTML parse)

**Strategie:**
- BFS (breadth-first) crawl z homepage
- Playwright pro JS rendering (sample: každá 10. stránka, nebo pokud tech stack = React/Vue/Angular/Next.js)
- Cheerio pro statické stránky (rychlejší, méně resources)
- Respektuje robots.txt (parsovaný v Step 1)
- User-Agent: custom ("MacroBot/1.0" + kontaktní email)

**Per-page data model:**
```typescript
interface CrawledPage {
  url: string;
  finalUrl: string;                    // po redirectech
  statusCode: number;
  redirectChain: RedirectHop[];        // [{from, to, statusCode}]
  responseTimeMs: number;
  contentType: string;
  contentLength: number;

  // Head
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  metaRobots: string | null;          // "noindex, nofollow" etc
  xRobotsTag: string | null;          // from HTTP header
  viewport: string | null;
  hreflang: HreflangEntry[];          // [{lang, href}]
  maxImagePreview: string | null;

  // Content
  h1: string[];
  h2: string[];
  h3: string[];
  wordCount: number;
  rawHtmlLength: number;

  // Links
  internalLinks: LinkData[];           // [{href, anchorText, isNofollow}]
  externalLinks: LinkData[];
  brokenLinks: string[];               // 4xx/5xx targets found during crawl

  // Images
  images: ImageData[];                 // [{src, alt, width, height, sizeKb, format}]

  // Structured Data
  jsonLd: object[];                    // parsed JSON-LD blocks
  microdata: object[];                 // parsed microdata

  // JS rendering (if applicable)
  jsRenderDiff: {
    contentDiffPercent: number;        // how much content differs raw vs rendered
    linksOnlyInRendered: number;       // links visible only after JS
  } | null;

  // Timing
  crawledAt: string;                   // ISO timestamp
  crawlDepth: number;                  // clicks from homepage
}
```

### 3.2 Analyzéry (Step 4) – modulární checky

Každý analyzér je samostatný modul. Vstup = pole CrawledPage + metadata (robots.txt, sitemap URLs). Výstup = pole Issue[].

**indexability-analyzer:**
- Noindex stránky v sitemapě → CRITICAL
- Canonical na 404/noindex/redirect → CRITICAL
- Canonical řetězení → WARNING
- Sitemap obsahuje non-200 URLs → WARNING
- Chybějící self-referencing canonical → WARNING
- Conflicting directives (noindex + sitemap) → CRITICAL
- robots.txt blokuje důležité sekce → CRITICAL

**architecture-analyzer:**
- Click depth > 4 na důležitých stránkách → WARNING
- Click depth > 5 → CRITICAL
- Orphan pages (v sitemapě ale ne v crawl grafu) → WARNING
- Stránky s < 3 interních odkazů → INFO
- URL s parametry bez canonical → WARNING
- Non-lowercase URLs → INFO
- URLs > 115 znaků → INFO

**performance-analyzer:**
- LCP > 4.0s → CRITICAL, > 2.5s → WARNING
- INP > 500ms → CRITICAL, > 200ms → WARNING
- CLS > 0.25 → CRITICAL, > 0.1 → WARNING
- TTFB > 600ms → WARNING, > 200ms → INFO
- Performance score < 50 → CRITICAL, < 90 → WARNING

**security-analyzer:**
- HTTP (ne HTTPS) → CRITICAL
- Mixed content → WARNING
- Missing HSTS → INFO
- Redirect chain > 2 hops → WARNING
- Redirect loop → CRITICAL
- 302 where 301 expected → INFO

**structured-data-analyzer:**
- Missing Organization schema → WARNING
- Missing BreadcrumbList → WARNING
- Missing Article/BlogPosting on blog posts → INFO
- FAQ pages without FAQPage schema → INFO
- E-commerce without Product schema → WARNING
- JSON-LD validation errors → WARNING

**on-page-analyzer:**
- Missing title → CRITICAL
- Duplicate titles → WARNING
- Title > 60 chars → INFO
- Title < 30 chars → WARNING
- Missing meta description → WARNING
- Duplicate meta descriptions → WARNING
- Missing H1 → CRITICAL
- Multiple H1 → WARNING
- H1 duplicates title → INFO
- Thin content (< 300 words on content pages) → WARNING
- Images missing alt text → WARNING
- Images > 150KB without optimization → INFO
- Missing max-image-preview:large → INFO

**aeo-geo-analyzer:**
- GPTBot blocked in robots.txt → WARNING (s kontextem)
- ClaudeBot blocked → WARNING
- PerplexityBot blocked → WARNING
- Missing llms.txt → INFO (recommendation)
- Missing author schema on articles → INFO
- Missing "O nás" page signals → INFO
- No external citations in content → INFO

**international-analyzer:**
- Non-reciprocal hreflang → CRITICAL
- Hreflang pointing to 404/redirect → CRITICAL
- Missing x-default → WARNING
- Invalid language codes → WARNING

### 3.3 AI Compilation (Step 5) – Claude prompt

```
System: You are a senior SEO analyst at a digital marketing agency.
You receive structured crawl data and issue lists from an automated 
technical SEO audit tool. Your job is to:

1. Write an executive summary (3-5 sentences) of the site's overall 
   technical SEO health
2. Score each issue on Impact (1-5) and Effort (1-5) based on:
   - Impact: scope (global template vs single page), commercial 
     relevance, AI influence
   - Effort: dev capacity needed, content workload, risk level
3. Assign each issue to a quadrant:
   - Quick Win (high impact, low effort)
   - Major Project (high impact, high effort)
   - Fill-in (low impact, low effort)
   - Time Waster (low impact, high effort)
4. Generate a prioritized action plan with sprint assignments:
   - Sprint 1: All Quick Wins + top 3 Critical Major Projects
   - Sprint 2: Remaining Major Projects
   - Backlog: Fill-ins
   - Discarded: Time Wasters
5. Write actionable recommendations in Czech language

User context (if provided): {custom_instructions}
Site tech stack: {detected_tech_stack}
Total pages crawled: {count}
```

---

## 4. Co NENÍ v MVP 1.1 (a proč)

| Feature | Důvod vyloučení | Kdy přidat |
|---------|----------------|------------|
| GSC API integrace | Vyžaduje OAuth + klientské přístupy | MVP 1.2 nebo 1.3 |
| GA4 API integrace | Vyžaduje OAuth + klientské přístupy | MVP 1.2 nebo 1.3 |
| Server log analýza (Fáze 10) | Vyžaduje přístup k serveru klienta | Budoucí, volitelný |
| Plný JS rendering všech stránek | Pomalý + resource heavy | Optimalizace v 1.2 |
| PDF analýza (Fáze 8.8) | Nice to have, ne core | 1.2 |
| Video indexace check (8.7) | Specifické, ne pro všechny weby | 1.2 |
| Shopping GPT check (11.6) | Jen pro e-shopy | 1.2 |
| Manuální AI citace test (11.8) | Vyžaduje API přístupy k AI službám | Budoucí modul |
| Export do Google Doc | Google API integrace | Po Google Workspace integraci |
| Duplicate content (near-duplicate) | Výpočetně náročný (simhash/minhash) | 1.2 |

---

## 5. User-facing parametry (Job launcher UI)

```
┌─────────────────────────────────────────────────┐
│  TECHNICKÁ SEO ANALÝZA                          │
│                                                  │
│  Klient: [dropdown – vybraný klient]            │
│                                                  │
│  Doména *                                        │
│  [https://www.example.cz          ]             │
│                                                  │
│  Hloubka crawlu                                  │
│  [3 ▼]  (1-5, default 3)                        │
│                                                  │
│  Maximální počet stránek                         │
│  [100 ▼]  (10 / 50 / 100 / 250 / 500)           │
│                                                  │
│  Poznámky a kontext (volitelné)                  │
│  [                                    ]          │
│  [  E-shop na Shopify, cílí na CZ trh,]         │
│  [  hlavní produkt jsou boty...       ]          │
│  [                                    ]          │
│                                                  │
│  [ ▶ Spustit analýzu ]                           │
│                                                  │
│  ⚡ Odhadovaný čas: ~5-10 min pro 100 stránek   │
└─────────────────────────────────────────────────┘
```

---

## 6. Výstupní report (UI struktura)

```
┌─────────────────────────────────────────────────┐
│  📊 TECHNICKÁ SEO ANALÝZA: example.cz           │
│  Klient: Firma XYZ | Datum: 28.2.2026           │
│                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│  │ Score   │ │ Critical│ │ Warning │ │ Info   ││
│  │  72/100 │ │    5    │ │   12    │ │   8    ││
│  │ 🟡      │ │ 🔴      │ │ 🟡      │ │ 🔵    ││
│  └─────────┘ └─────────┘ └─────────┘ └────────┘│
│                                                  │
│  📝 Executive Summary                            │
│  Web example.cz vykazuje solidní technický základ│
│  ale má kritické problémy s kanonizací a...      │
│                                                  │
│  ─── KATEGORIE ───                               │
│                                                  │
│  ▼ Indexace a viditelnost (3 critical, 2 warning)│
│    🔴 15 URL v sitemapě má noindex tag           │
│    🔴 Canonical řetězení na produktových str.    │
│    🔴 robots.txt blokuje /api/products/          │
│    🟡 Chybí self-referencing canonical na 45 str.│
│    🟡 8 URL v sitemapě vrací 301                 │
│                                                  │
│  ▼ Rychlost a výkon (1 critical, 3 warning)     │
│  ▼ Architektura (0 critical, 4 warning)         │
│  ▼ On-page (1 critical, 3 warning, 5 info)      │
│  ▼ Strukturovaná data (0 critical, 2 warning)   │
│  ▼ Bezpečnost (0 critical, 1 warning)           │
│  ▼ AEO / GEO (0 critical, 3 info)              │
│                                                  │
│  ─── AKČNÍ PLÁN ───                              │
│                                                  │
│  Sprint 1 (Quick Wins + Top Critical):           │
│  ☐ Opravit robots.txt blokaci /api/products/    │
│  ☐ Odstranit noindex z 15 produktových stránek  │
│  ☐ Implementovat llms.txt                        │
│  ...                                             │
│                                                  │
│  [📄 Export PDF]  [📋 Kopírovat tikety]          │
└─────────────────────────────────────────────────┘
```

---

## 7. Aktualizace steering docs

### libraries.md – nové typy
- CrawledPage interface
- Analyzer output interfaces
- TechnicalAuditResult rozšířeno o quadrant assignments

### tech.md – nové worker dependencies
- playwright (headless Chromium)
- cheerio (HTML parsing)
- robots-parser
- xml2js (sitemap parsing)
- lighthouse (volitelně, v budoucnu místo PSI API)

### decisions.md – nové ADR
- ADR-006: Playwright + cheerio hybrid crawler (ne Screaming Frog API)
- ADR-007: PageSpeed Insights API místo lokálního Lighthouse (MVP)
- ADR-008: Sample JS rendering (ne full render) pro performance

---

## 8. Omezení MVP 1.1 (disclaimer pro uživatele)

Report by měl obsahovat sekci "Omezení tohoto auditu":
- Bez přístupu ke GSC – nelze ověřit reálný stav indexace Google
- Bez přístupu k server logům – nelze analyzovat crawl budget
- JS rendering na vzorku – některé JS issues mohou být přehlédnuty
- Near-duplicate detection není implementován
- PageSpeed data jsou laboratorní (lab), ne polní (field/CrUX)

Tato omezení zmizí postupně s integrací GSC API (MVP 1.2/1.3).
