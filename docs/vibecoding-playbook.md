# agency_ops: Vibecoding Implementation Playbook

## MVP 1.1 – Technická SEO Analýza

### Jak používat tento dokument

Toto je sekvence vibecoding promptů pro Cursor nebo Claude Code.
Spouštěj je **po jednom, v pořadí**. Po každém bloku:
1. Ověř, že výstup funguje (build, test, vizuální kontrola)
2. Commitni (`git commit`)
3. Teprve pak pokračuj na další blok

**Pravidla:**
- NIKDY nespouštěj více bloků najednou
- Každý prompt odkazuje na steering docs – agent ví co dělat
- Pokud agent halucinuje, ZASTAV a odkaz ho zpět na steering doc
- Po blocích 3, 6, 9, 12: checkpoint do active-plan.md

---

## BLOK 1: Project Scaffold (Monorepo + Configs)

### Prompt 1.1: Inicializace monorepa

```
Přečti docs/tech.md (sekce Directory Structure a Monorepo Strategy).

Vytvoř Turborepo monorepo s touto strukturou:
- apps/web (Next.js 15, App Router, TypeScript strict)
- workers/job-runner (Node.js, TypeScript)
- packages/shared (TypeScript library)

Konfiguruj:
- turbo.json s pipeline pro build, dev, lint, test
- Root package.json s workspaces
- tsconfig.json (base) s strict mode
- .gitignore (node_modules, .env*, .next, dist)
- .env.example se všemi proměnnými z docs/tech.md (Environment Variables)
- .nvmrc (Node 22)

NEGENERUJ žádné komponenty ani stránky – jen scaffold a konfigurace.
```

### Prompt 1.2: Next.js app setup

```
Přečti docs/tech.md (sekce Stack).

V apps/web:
- Inicializuj Next.js 15 s App Router, TypeScript, Tailwind v4, ESLint
- Nainstaluj dependencies: @supabase/supabase-js, @supabase/ssr, zustand,
  react-hook-form, @hookform/resolvers, zod, date-fns, lucide-react
- Inicializuj shadcn/ui (New York style, slate base)
- Přidej shadcn komponenty: button, card, input, label, textarea, select,
  badge, dialog, dropdown-menu, separator, skeleton, table, tabs, progress,
  toast, tooltip, avatar, sheet
- Nastav path aliases (@/ pro src/)

NEGENERUJ žádné stránky – jen setup a dependencies.
```

### Prompt 1.3: Worker setup

```
Přečti docs/tech.md (sekce Stack + Directory Structure → workers/).

V workers/job-runner:
- Inicializuj Node.js TypeScript projekt
- Nainstaluj: @supabase/supabase-js, @anthropic-ai/sdk, playwright,
  cheerio, robots-parser, xml2js, zod, pino
- Vytvoř Dockerfile (Node 22, nainstaluj Playwright Chromium)
- Vytvoř tsconfig.json (strict, ES2022 target, NodeNext module)
- Vytvoř src/index.ts jako prázdný entry point s komentářem "// Job worker entry"

NEGENERUJ žádnou job logiku – jen scaffold.
```

### Prompt 1.4: Shared package

```
Přečti docs/libraries.md (všechny TypeScript interfaces a typy).

V packages/shared vytvoř:
- src/types/client.ts – Client, ClientMember typy (odpovídající DB schema)
- src/types/job.ts – Job, JobStatus, JobType typy
- src/types/seo.ts – TechnicalAuditResult, CategoryResult, Issue, PageResult,
  CrawledPage a všechny související interfaces z libraries.md a
  seo-technical-audit-blueprint.md
- src/constants/job-types.ts – registry job typů ("seo.technical-audit" etc.)
- src/index.ts – re-export všeho

Typy MUSÍ přesně odpovídat DB schema v libraries.md. Použij Zod schemas
pro runtime validaci + TypeScript typy pro compile-time safety.
```

**✅ Checkpoint po Bloku 1:** `npm run build` musí projít bez chyb ve všech workspaces.

---

## BLOK 2: Supabase Schema + Auth

### Prompt 2.1: Supabase inicializace

```
Inicializuj Supabase v projektu:
- supabase init (pokud ještě není)
- Vytvoř první migraci: supabase/migrations/001_initial_schema.sql

Migrace musí obsahovat PŘESNĚ schema z docs/libraries.md:
- Tabulka profiles (s trigger pro auto-create z auth.users)
- Tabulka clients
- Tabulka client_members
- Tabulka jobs
- Tabulka audit_log
- Všechny indexy (jobs: status+created_at, client_members: unique constraint)
- Enum typy nebo CHECK constraints pro status/role fields

VŠECHNY tabulky musí mít RLS ENABLED.
```

### Prompt 2.2: RLS Policies

```
Přečti docs/libraries.md (RLS Policy poznámky u každé tabulky) a
docs/project_goal.md (Security Constraints).

Vytvoř migraci: supabase/migrations/002_rls_policies.sql

RLS pravidla:
- profiles: Users can read/update own profile. Admins can read all.
- clients: Users see only clients where they are in client_members.
  Admins can CRUD all.
- client_members: Users see own memberships. Admins manage all.
- jobs: Users see jobs for clients they're member of. Any member can create.
  Only admin or creator can cancel.
- audit_log: Admins read all. Members read logs for their clients. Insert-only
  (no update/delete).

CRITICAL: Otestuj každou policy komentářem s příkladem co MUSÍ projít a co MUSÍ být zablokováno.
```

### Prompt 2.3: Supabase client helpers

```
Přečti docs/tech.md (Data Access rules).

V apps/web/src/lib/supabase/ vytvoř:
- client.ts – Browser Supabase client (createBrowserClient)
- server.ts – Server-side Supabase client (createServerClient pro RSC)
- middleware.ts – Next.js middleware pro auth session refresh
- types.ts – Vygeneruj types pomocí `supabase gen types typescript`
  (nebo vytvoř manuálně z DB schema pokud CLI není dostupný)

V workers/job-runner/src/lib/:
- supabase.ts – Service role client (SUPABASE_SERVICE_ROLE_KEY)
  s komentářem: "// NEVER use on frontend. Worker-only."

Root middleware.ts (apps/web/src/middleware.ts):
- Refresh auth session na každém requestu
- Redirect nepřihlášené na /login
- Propouštěj /login a /signup
```

### Prompt 2.4: Seed data

```
Vytvoř supabase/seed.sql:
- 1 admin user (admin@macroconsulting.cz)
- 1 regular user (analyst@macroconsulting.cz)
- 3 demo klienti:
  1. "MacroConsulting" (doména: macroconsulting.cz, interní projekty)
  2. "Demo E-shop" (doména: example-shop.cz, e-commerce kontext)
  3. "Demo SaaS" (doména: example-saas.cz, B2B SaaS kontext)
- client_members: admin má přístup ke všem, analyst ke 2 z 3
- 1 dokončený demo job s ukázkovým result JSON (pro testování UI reportu)
```

**✅ Checkpoint po Bloku 2:** `supabase db reset` projde, seed data viditelná v Supabase Studio.

---

## BLOK 3: Design Tokens + Layout Shell

### Prompt 3.1: Design tokeny do Tailwind

```
Přečti docs/design.md CELÝ – barevná paleta, typografie, spacing, layout.

Aktualizuj apps/web/tailwind.config.ts:
- Přidej všechny barvy z design.md jako custom tokeny
  (primary, secondary, surface, border, text-primary, text-secondary,
  text-muted, success, warning, error, info + score gradient)
- Font: Inter z Google Fonts (přidej do layout.tsx)
- Font mono: JetBrains Mono

Aktualizuj globals.css:
- CSS custom properties pro shadcn/ui theme (namapuj na naše tokeny)
- Base styles (body background, text color, font)

NEGENERUJ žádné komponenty – jen token konfigurace.
Žádné hardcoded hex hodnoty v komponentách – VÝHRADNĚ tokeny.
```

### Prompt 3.2: Auth stránky (Login + Signup)

```
Přečti docs/design.md (layout, component rules).

Vytvoř:
- apps/web/src/app/(auth)/login/page.tsx
  - Email + heslo formulář (react-hook-form + zod validace)
  - Supabase signInWithPassword
  - Error handling (špatné heslo, neexistující user)
  - Link na signup
  - MacroConsulting logo nahoře
  - Minimalistický layout (centrovaná karta na surface pozadí)

- apps/web/src/app/(auth)/signup/page.tsx
  - Email + heslo + full name
  - Supabase signUp
  - Po úspěchu: redirect na login s "Check your email" zprávou
  - Link na login

Použij VÝHRADNĚ shadcn/ui komponenty a design tokeny z design.md.
```

### Prompt 3.3: Dashboard layout shell

```
Přečti docs/design.md (Layout sekce – Sidebar, Header, Content area).

Vytvoř:
- apps/web/src/app/(dashboard)/layout.tsx
  Protected layout s:
  - Sidebar (w-64, fixed, secondary background #1A1A2E)
    - MacroConsulting logo (text placeholder pro teď)
    - Client selector dropdown (placeholder, data later)
    - Navigation:
      - Dashboard (Home icon)
      - SEO > Technical Audit, Keyword Analysis (disabled badge "soon")
      - (budoucí sekce jako disabled s "Připravujeme" tooltipem)
    - Settings link (dole)
    - User avatar + jméno + logout (úplně dole)
  - Header (h-16, sticky, white, bottom border)
    - Breadcrumb (dynamic)
    - Mobile menu toggle (sheet)
  - Content area (flex-1, max-w-7xl, mx-auto, px-6, py-8)

- apps/web/src/components/layout/sidebar.tsx
- apps/web/src/components/layout/header.tsx
- apps/web/src/components/layout/mobile-nav.tsx (Sheet pro mobil)

Layout musí být PLNĚ RESPONZIVNÍ. Na mobilu: sidebar skrytý, hamburger v headeru.
Sidebar navigace musí reflektovat strukturu z tech.md (directory structure → route groups).
```

**✅ Checkpoint po Bloku 3:** Přihlášení funguje, dashboard layout se zobrazí s prázdným obsahem. Vizuální kontrola: sidebar tmavý, content světlý, MacroConsulting barvy.

---

## BLOK 4: Client Management

### Prompt 4.1: Client list (dashboard homepage)

```
Přečti docs/libraries.md (clients tabulka + API endpoints).

Vytvoř:
- apps/web/src/app/(dashboard)/page.tsx
  Dashboard stránka zobrazující:
  - Grid klientských karet (responsive: 1 col mobile, 2 md, 3 lg)
  - Každá karta: jméno klienta, doména, status badge (active/inactive),
    počet dokončených jobů, tlačítko "Otevřít"
  - Empty state pokud žádní klienti
  - "Přidat klienta" button (admin only – ověř role z profiles)

- apps/web/src/components/clients/client-card.tsx
- apps/web/src/app/api/clients/route.ts (GET – list s RLS filtrováním)

Data načítej server-side (RSC), ne client-side fetch.
```

### Prompt 4.2: Client detail + nový klient

```
Přečti docs/libraries.md (clients schema + client_members).

Vytvoř:
- apps/web/src/app/(dashboard)/clients/[id]/page.tsx
  Client detail stránka:
  - Header: jméno, doména (jako link), status
  - Tabs: "Přehled" | "SEO Jobs" | "Nastavení" (Nastavení = admin only)
  - Tab Přehled: brand voice, poznámky, metadata, team members
  - Tab SEO Jobs: seznam jobů pro tohoto klienta (zatím placeholder tabulka)
  - Tab Nastavení: edit formulář (jméno, doména, brand voice, poznámky)

- apps/web/src/app/(dashboard)/clients/new/page.tsx
  Formulář pro vytvoření klienta (admin only):
  - Jméno*, doména, brand voice (textarea), poznámky (textarea)
  - Zod validace, Supabase insert

- apps/web/src/app/api/clients/route.ts (rozšíř o POST)
- apps/web/src/app/api/clients/[id]/route.ts (GET, PATCH, DELETE)

CRUD musí respektovat RLS. Admin check na frontendu + RLS na backendu (double layer).
```

**✅ Checkpoint po Bloku 4:** Lze vytvořit klienta, zobrazit seznam, otevřít detail. Seed data viditelná.

---

## BLOK 5: Job Infrastructure (Queue + Worker)

### Prompt 5.1: Job API + queue mechanismus

```
Přečti docs/libraries.md (jobs tabulka, API endpoints, Job Creation Payload).
Přečti docs/tech.md (Job Execution rules).

Vytvoř:
- apps/web/src/app/api/jobs/route.ts
  POST: Vytvoří job record v Supabase
    - Validuj payload přes Zod (z packages/shared)
    - Nastav status: 'queued', timeout_at: now + 15min
    - Zapiš do audit_log
    - Return job ID

  GET: Seznam jobů pro klienta (?client_id=X)
    - Seřazeno od nejnovějšího
    - RLS zajistí filtrování

- apps/web/src/app/api/jobs/[id]/route.ts
  GET: Detail jobu (status, progress, result)
  POST /cancel: Nastav status 'cancelled'

- apps/web/src/hooks/use-job-progress.ts
  Custom hook: subscribe na Supabase Realtime channel pro job progress
  - Poslouchej changes na jobs tabulce filtrované na job ID
  - Return: { status, progress, progressMessage }
```

### Prompt 5.2: Worker job consumer

```
Přečti docs/tech.md (Data flow pro Job execution, Job Execution rules).
Přečti seo-technical-audit-blueprint.md (celkový flow).

V workers/job-runner/src/ vytvoř:
- index.ts: Worker entry point
  - Poll Supabase jobs tabulku každých 5 sekund
  - Query: status = 'queued', ORDER BY created_at ASC, LIMIT 1
  - SELECT FOR UPDATE SKIP LOCKED (prevent double pickup)
  - Nastav status 'running', started_at = now()
  - Dispatch na handler podle job_type
  - Error handling: catch → status 'failed' + error details
  - Timeout check: pokud now() > timeout_at → fail

- queue/consumer.ts: Queue consumer abstrakce
  - pollForJob(): Promise<Job | null>
  - updateProgress(jobId, progress, message): Promise<void>
  - completeJob(jobId, result): Promise<void>
  - failJob(jobId, error): Promise<void>

- jobs/registry.ts: Job type → handler mapping
  - "seo.technical-audit" → (zatím placeholder handler)

Handler interface:
  (job: Job, updateProgress: ProgressFn) => Promise<JobResult>

Worker MUSÍ:
- Logovat strukturovaně (pino)
- Updatovat progress min. každých 30 sekund
- Respektovat timeout
- Max 3 retry attempts
```

### Prompt 5.3: Job launcher UI + progress tracking

```
Přečti docs/design.md (component rules, Job-specific components).
Přečti seo-technical-audit-blueprint.md (sekce 5: User-facing parametry).

Vytvoř:
- apps/web/src/app/(dashboard)/seo/technical-audit/page.tsx
  Job launcher formulář:
  - Client selector (z kontextu nebo dropdown)
  - Doména (text input, required, validace URL formát)
  - Hloubka crawlu (select: 1-5, default 3)
  - Max stránek (select: 10/50/100/250/500, default 100)
  - Poznámky a kontext (textarea, optional)
  - "Spustit analýzu" button
  - Odhadovaný čas info text

  Po spuštění:
  - Redirect na job detail stránku
  - NEBO: na stejné stránce zobrazit progress

- apps/web/src/app/(dashboard)/clients/[id]/jobs/[jobId]/page.tsx
  Job status stránka:
  - Pokud running: progress bar (animated) + status message + elapsed time
  - Pokud queued: "Čeká ve frontě..." skeleton
  - Pokud completed: redirect na report view (nebo inline zobrazení)
  - Pokud failed: error message s detaily

- apps/web/src/components/jobs/job-progress.tsx
  Reusable progress component (použij hook use-job-progress.ts)

- apps/web/src/components/jobs/job-launcher-form.tsx
  Reusable form component
```

**✅ Checkpoint po Bloku 5:** Lze spustit job z UI, job se objeví v DB jako 'queued'. Worker ho pickne, nastaví 'running', a (zatím) okamžitě 'completed' s placeholder result. Progress tracking funguje v reálném čase.

---

## BLOK 6: SEO Crawler Engine

### Prompt 6.1: Crawler core

```
Přečti seo-technical-audit-blueprint.md (sekce 3.1 Crawler + Step 2 CRAWL).
Přečti packages/shared/src/types/seo.ts (CrawledPage interface).

V workers/job-runner/src/jobs/seo/technical-audit/ vytvoř:
- crawler.ts: Hlavní crawler modul

Implementuj BFS crawler:
1. Input: domain, maxDepth, maxPages, progressCallback
2. Resolve base URL (handle www/non-www, HTTP/HTTPS redirects)
3. Fetch a parse robots.txt (robots-parser)
4. Fetch a parse sitemap.xml (xml2js) → collect known URLs
5. BFS crawl:
   - Start queue: [baseUrl] + sitemap URLs
   - Max concurrent: 5 requests (semaphore)
   - Delay: 200ms mezi requesty na stejný domain (politeness)
   - Pro každou stránku:
     a. HTTP GET (cheerio pro parse)
     b. Extract ALL fields z CrawledPage interface
     c. Discover internal links → add to queue (if depth < maxDepth)
     d. Track visited URLs (Set)
   - JS rendering: pokud tech stack detection najde React/Vue/Angular/Next.js,
     použij Playwright pro každou 10. stránku
   - Progress callback: po každých 10 stránkách
6. Output: CrawledPage[]

CRITICAL:
- Respektuj robots.txt (skip blocked URLs)
- Handle redirects (track chain)
- Handle timeouts (10s per page)
- Handle errors gracefully (log, continue, don't crash)
- User-Agent: "MacroBot/1.0 (+https://macroconsulting.cz/bot)"
```

### Prompt 6.2: Tech stack detection

```
V workers/job-runner/src/jobs/seo/technical-audit/ vytvoř:
- tech-detector.ts

Detekce tech stacku z HTML homepage + HTTP headers:
- CMS: WordPress (wp-content), Shoptet (shoptet-), Shopify (cdn.shopify),
  Webflow, Wix, Squarespace, custom
- JS framework: React (react, __NEXT_DATA__), Vue (vue, nuxt),
  Angular (ng-version), Svelte
- CDN: Cloudflare (cf-ray header), AWS CloudFront, Fastly, Vercel
- Analytics: GA4 (gtag, G-), GTM (googletagmanager), Hotjar
- Structured: JSON-LD presence, Microdata presence

Return: TechStack object s detected technologies.
Toto ovlivní strategii crawleru (JS rendering ano/ne).
```

### Prompt 6.3: PageSpeed Insights integrace

```
Přečti seo-technical-audit-blueprint.md (Step 3: PAGESPEED).

V workers/job-runner/src/jobs/seo/technical-audit/ vytvoř:
- pagespeed.ts

Implementuj:
1. Input: URLs to test (homepage + top N pages by inlink count)
2. Pro každou URL zavolej PageSpeed Insights API:
   - URL: https://www.googleapis.com/pagespeedonline/v5/runPagespeed
   - Params: url, strategy=mobile, category=performance
   - (Volitelně i strategy=desktop pro srovnání)
3. Extract: LCP, INP (z diagnostics), CLS, TTFB, Performance Score
4. Rate limiting: max 1 request/s (API limit)
5. Fallback: pokud API nedostupné, skip s warning

NOTE: PSI API je zdarma bez API klíče (limit 25k/day).
Pokud máme API klíč, použij ho (vyšší limity).
Return: PageSpeedResult[] array.
```

**✅ Checkpoint po Bloku 6:** Crawler dokáže procrawlovat testovací web (např. macroconsulting.cz s depth 2, max 20 stránek) a vrátit strukturovaná data. Loguj výstup do console pro ověření.

---

## BLOK 7: Analyzéry

### Prompt 7.1: Analyzer framework + první 3 analyzéry

```
Přečti seo-technical-audit-blueprint.md (sekce 3.2 Analyzéry – VŠECHNY specifikace).

V workers/job-runner/src/jobs/seo/technical-audit/analyzers/ vytvoř:

Nejdřív framework:
- base.ts: BaseAnalyzer interface
  Input: CrawledPage[], robotsTxt, sitemapUrls, techStack
  Output: Issue[] (z shared types)
  Každý Issue má: severity, title, description, affected_urls, recommendation

Pak první 3 analyzéry (každý jako samostatný soubor):

1. indexability.ts (IndexabilityAnalyzer)
   Implementuj VŠECHNY checky z blueprintu sekce indexability-analyzer

2. on-page.ts (OnPageAnalyzer)
   Implementuj VŠECHNY checky z blueprintu sekce on-page-analyzer

3. security.ts (SecurityAnalyzer)
   Implementuj VŠECHNY checky z blueprintu sekce security-analyzer

Každý analyzér musí být spustitelný nezávisle a vrátit pole Issue[].
```

### Prompt 7.2: Zbylých 5 analyzérů

```
Přečti seo-technical-audit-blueprint.md (sekce 3.2 – zbylé analyzéry).

Pokračuj v workers/job-runner/src/jobs/seo/technical-audit/analyzers/:

4. architecture.ts (ArchitectureAnalyzer)
   Click depth, orphan pages, URL structure, internal link distribution

5. performance.ts (PerformanceAnalyzer)
   LCP, INP, CLS, TTFB prahy z blueprintu. Input: PageSpeedResult[]

6. structured-data.ts (StructuredDataAnalyzer)
   JSON-LD extraction, schema type coverage, validation

7. aeo-geo.ts (AeoGeoAnalyzer)
   AI bot access check, llms.txt, E-E-A-T signals, answer-first format hints

8. international.ts (InternationalAnalyzer)
   Hreflang validation (only if hreflang detected in crawl)

Plus:
- index.ts: Export všech analyzérů + runAllAnalyzers() funkce
  která spustí všechny paralelně (Promise.all) a vrátí
  { [category: string]: CategoryResult }
```

**✅ Checkpoint po Bloku 7:** Analyzéry fungují nad crawl daty z Bloku 6. Unit testy na klíčové scénáře (missing title → critical, redirect loop → critical, etc.)

---

## BLOK 8: AI Compilation + Job Handler

### Prompt 8.1: Claude AI integration

```
Přečti seo-technical-audit-blueprint.md (sekce 3.3 AI Compilation + Claude prompt).
Přečti docs/tech.md (Model Tiering).

V workers/job-runner/src/ vytvoř:

- lib/ai.ts: Anthropic client wrapper
  - Inicializace @anthropic-ai/sdk s ANTHROPIC_API_KEY
  - Helper: generateSeoReport(issues, crawlStats, techStack, customInstructions)
  - Model: claude-sonnet-4-6
  - System prompt: Z blueprintu sekce 3.3 (senior SEO analyst role)
  - User message: strukturovaná data (issues JSON + stats)
  - Expected output: JSON s executive_summary, scored_issues (impact/effort),
    quadrant_assignments, action_plan (sprint 1, 2, backlog), recommendations_text
  - Parse response, validuj Zod schematem
  - Error handling: retry 2x, pak fallback (report bez AI summary)

DŮLEŽITÉ: Response musí být v ČEŠTINĚ (specifikuj v system promptu).
Max tokens: 4096 (dostatečné pro report).
```

### Prompt 8.2: Main job handler (orchestrace celého pipeline)

```
Přečti seo-technical-audit-blueprint.md (sekce 2: Technická architektura, celkový flow).

V workers/job-runner/src/jobs/seo/technical-audit/ vytvoř:
- handler.ts: Hlavní orchestrátor celé analýzy

Implementuj 6-step pipeline:
1. PREPARATION (progress 0→5%)
   - Parse job params (domain, crawl_depth, max_pages, custom_instructions)
   - Resolve domain, fetch robots.txt + sitemap
   - Detect tech stack

2. CRAWL (progress 5→50%)
   - Spusť crawler s progressive progress updates

3. PAGESPEED (progress 50→60%)
   - Vyber homepage + top 5 stránek (by inlink count)
   - Zavolej PSI API

4. ANALYSIS (progress 60→80%)
   - Spusť všech 8 analyzérů (Promise.all)
   - Zkompiluj do CategoryResult map

5. AI COMPILATION (progress 80→95%)
   - Zavolej Claude s issues + stats + custom instructions
   - Parse AI response

6. REPORT ASSEMBLY (progress 95→100%)
   - Sestav finální TechnicalAuditResult JSON
   - Return jako job result

Error handling na KAŽDÉM stepu:
- Pokud step failne, ulož partial results + error
- Pokud crawl failne úplně → fail celý job
- Pokud PSI failne → pokračuj bez PSI dat (degraded mode)
- Pokud AI failne → pokračuj s report bez AI summary

Registruj handler v jobs/registry.ts.
```

**✅ Checkpoint po Bloku 8:** End-to-end test: spustit job z UI → worker provede celý pipeline → result se uloží v DB. Otestuj na macroconsulting.cz (depth 2, max 20 stránek).

---

## BLOK 9: Report UI

### Prompt 9.1: Report view – hlavní stránka

```
Přečti seo-technical-audit-blueprint.md (sekce 6: Výstupní report UI struktura).
Přečti docs/design.md (Score gradient, component rules).

Vytvoř:
- apps/web/src/app/(dashboard)/clients/[id]/jobs/[jobId]/page.tsx
  (rozšíř existující – pokud job completed, zobraz report)

Report layout:
1. Header: doména, klient, datum, duration
2. Score karty (4x): Overall score (barevný dle gradient), Critical count,
   Warning count, Info count
3. Executive summary (z AI compilation)
4. Kategorie (collapsible accordiony):
   Každá kategorie = název + score badge + issue count
   Po rozbalení: seznam issues seřazený severity (critical → warning → info)
   Každý issue = severity badge + title + description + affected URLs (collapsible)
   + recommendation text
5. Akční plán:
   Sprint 1 (Quick Wins) – checkboxy
   Sprint 2 (Major Projects) – checkboxy
   Backlog (Fill-ins)
   Discarded (Time Wasters) – šedé

Komponenty:
- apps/web/src/components/seo/report-header.tsx
- apps/web/src/components/seo/score-cards.tsx
- apps/web/src/components/seo/category-section.tsx
- apps/web/src/components/seo/issue-card.tsx
- apps/web/src/components/seo/action-plan.tsx

Všechny severity barvy přes design tokeny (error=critical, warning=warning, info=info).
Score badge barvy přes score gradient z design.md.
```

### Prompt 9.2: Report – detailní interakce

```
Rozšíř report UI o:

1. Filtrování issues:
   - Severity filter (All / Critical / Warning / Info)
   - Kategorie filter (multi-select)
   - Vyhledávání v titles a descriptions

2. Issue detail modal/sheet:
   - Kliknutí na issue otevře detail s:
     - Plný description
     - Affected URLs (scrollable list, max 50 zobrazených)
     - Recommendation
     - Impact/Effort badge
     - Quadrant badge

3. Crawl statistiky tab:
   - Total pages crawled
   - Status code distribution (pie chart nebo stacked bar – recharts)
   - Click depth distribution
   - Response time distribution
   - Top 10 nejpomalejších stránek

4. Omezení auditu sekce:
   - Zobraz disclaimery z blueprintu (sekce 8: Omezení MVP 1.1)

Použij shadcn Sheet pro mobile-friendly detail views.
```

**✅ Checkpoint po Bloku 9:** Kompletní report zobrazitelný v UI s reálnými daty z testu. Vizuální kontrola na desktopu i mobilu.

---

## BLOK 10: PDF Export

### Prompt 10.1: PDF generátor

```
Přečti docs/design.md (barvy, typografie – musí se promítnout do PDF).

Implementuj PDF export reportu:

Technologie: React-PDF (@react-pdf/renderer) NEBO html-to-pdf
(Puppeteer/Playwright page.pdf()) – vyber robustnější variantu.

DOPORUČENÍ: Playwright page.pdf() – máme Playwright v workeru,
vyrobíme HTML template → renderujeme do PDF. Konzistentní s web UI.

Vytvoř:
- workers/job-runner/src/jobs/seo/technical-audit/pdf-generator.ts
  NEBO
- apps/web/src/app/api/jobs/[id]/pdf/route.ts (API route pro on-demand PDF gen)

PDF musí obsahovat:
1. Titulní strana: MacroConsulting logo area, doména, klient, datum
2. Executive summary
3. Score overview (4 metriky)
4. Kategorie s issues (severity barvy)
5. Akční plán (tabulka: issue, impact, effort, quadrant, sprint)
6. Omezení auditu
7. Footer: "Vygenerováno platformou agency_ops | MacroConsulting"

Styl: profesionální, čistý, MacroConsulting barvy (primary žlutá pro akcenty,
navy pro headery). Font: Inter (embeddovaný nebo system fallback).

API endpoint: GET /api/jobs/[id]/pdf → stream PDF response.
UI button: "📄 Export PDF" na report stránce → stáhne soubor.
```

**✅ Checkpoint po Bloku 10:** PDF se vygeneruje, stáhne, otevře v prohlížeči. Vizuálně profesionální, čitelné, barvy odpovídají.

---

## BLOK 11: Polish + Jobs History

### Prompt 11.1: Job history v klientském detailu

```
Na stránce clients/[id] tab "SEO Jobs" implementuj:
- Tabulka všech jobů pro klienta
- Sloupce: Datum, Typ jobu, Status (badge), Score, Trvání, Akce
- Status badge: queued (šedý), running (modrý animated), completed (zelený),
  failed (červený), cancelled (šedý)
- Klik na řádek → otevře report
- Řazení: nejnovější nahoře
- Pagination pokud > 20 jobů

Přidej "Spustit novou analýzu" button (→ redirect na SEO technical audit launcher
s předvyplněným klientem).
```

### Prompt 11.2: Dashboard vylepšení

```
Na hlavním dashboardu (/) přidej:
- Statistiky nahoře: celkem klientů, celkem jobů tento měsíc,
  průměrné skóre posledních analýz
- Recent activity: posledních 5 dokončených jobů napříč klienty
  (klient, typ, datum, score) – klikatelné
- Quick action: "Nová technická analýza" button

Na sidebar: aktivní navigační item zvýrazněný primary barvou.
Breadcrumb v headeru reflektuje aktuální pozici.
```

### Prompt 11.3: Error handling + loading states

```
Projdi VŠECHNY stránky a ověř:
1. Každý data fetch má loading state (skeleton z shadcn)
2. Každý data fetch má error state (alert s retry button)
3. Každý seznam má empty state (ilustrace nebo text + CTA)
4. Formuláře: disabled stav při submitting, validační chyby inline
5. Toast notifikace pro úspěšné akce (job spuštěn, klient vytvořen)
6. 404 stránka (not-found.tsx)

Pokud něco chybí, doplň. NEOPRAVUJ fungující logiku, jen přidej
chybějící UI states.
```

**✅ Checkpoint po Bloku 11:** Kompletní flow: login → dashboard → vyber klienta → spusť analýzu → sleduj progress → zobraz report → exportuj PDF. Všechny states (loading, error, empty) fungují.

---

## BLOK 12: Deploy + Finalizace

### Prompt 12.1: Vercel deploy konfigurace

```
Přečti docs/tech.md (Frontend hosting: Vercel).

Konfiguruj:
- vercel.json (pokud potřeba) pro apps/web
- Environment variables v Vercel (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- Build command: cd apps/web && npm run build
- Output directory: apps/web/.next
- Root directory: apps/web (nebo Turborepo root s turbo build filter)

Ověř: npm run build projde bez chyb a warningů.
```

### Prompt 12.2: Railway worker deploy konfigurace

```
Přečti docs/tech.md (Workers: Railway Docker).

V workers/job-runner/:
- Ověř Dockerfile:
  FROM node:22-slim
  Nainstaluj Playwright Chromium dependencies
  COPY + build
  CMD ["node", "dist/index.js"]

- Přidej .dockerignore
- Railway environment variables:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
  JOB_POLL_INTERVAL_MS=5000, JOB_MAX_TIMEOUT_MS=900000

- Health check endpoint (optional): HTTP server na /health

Ověř: docker build + docker run lokálně funguje.
```

### Prompt 12.3: Finální review

```
Proveď finální kontrolu celého projektu:

1. Security check:
   - Žádné API klíče v kódu (.env.example má jen placeholder)
   - RLS enabled na všech tabulkách
   - Auth middleware na všech protected routes
   - No console.log s citlivými daty

2. TypeScript check:
   - npm run build bez chyb
   - Žádné @ts-ignore nebo any bez komentáře

3. Responzivita:
   - Otestuj na 375px (mobile), 768px (tablet), 1280px (desktop)

4. Performance:
   - Lazy load těžké komponenty (report charts)
   - Image optimization (next/image)

Výstup: seznam nalezených problémů nebo "All checks passed".
```

**✅ FINAL CHECKPOINT:** Celá aplikace deploynutá, funkční end-to-end. Steering docs aktualizovány (pravidlo #14).

---

## Odhadovaný čas implementace

| Blok | Popis | Odhadovaný čas |
|------|-------|----------------|
| 1 | Project scaffold | 1-2 hodiny |
| 2 | Supabase schema + auth | 1-2 hodiny |
| 3 | Design tokens + layout | 2-3 hodiny |
| 4 | Client management | 2-3 hodiny |
| 5 | Job infrastructure | 3-4 hodiny |
| 6 | SEO Crawler engine | 4-6 hodin |
| 7 | Analyzéry (8 modulů) | 4-6 hodin |
| 8 | AI compilation + handler | 2-3 hodiny |
| 9 | Report UI | 3-4 hodiny |
| 10 | PDF export | 2-3 hodiny |
| 11 | Polish + history | 2-3 hodiny |
| 12 | Deploy + finalizace | 1-2 hodiny |
| **TOTAL** | | **~27-41 hodin vibecoding** |

S reálným debugging a iteracemi: **~40-60 hodin** celkem.
Rozloženo na 2-3 týdny práce (part-time) nebo 1 intenzivní týden (full-time).

---

## Post-MVP roadmap

Po dokončení MVP 1.1:
1. **MVP 1.2:** Analýza klíčových slov (nový Job)
2. **MVP 1.3:** GSC/GA4 integrace (OAuth flow, obohacení SEO dat)
3. **v1.1:** Google Workspace integrace (Shared Drive, report do Google Doc)
4. **v1.2:** Slack integrace (notifikace o dokončených jobech)
5. **v2.0:** Content modul (scraper, topic recommender)
6. **v2.1:** Reporting modul (Google Ads, Sklik, Meta API)
7. **v3.0:** Background agents (scheduled jobs, autonomní monitoring)
