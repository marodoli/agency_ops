# Active Plan — Agency Ops

## Aktuální stav: BLOK 9 — Crawler + PageSpeed (hotovo)

### Hotovo
- [x] BLOK 1: DB schema + RLS policies + helper funkce
- [x] BLOK 2: Seed data, Supabase clients (browser + server + middleware), generated DB types
- [x] BLOK 2: Design tokens (globals.css), 18 shadcn/ui komponent
- [x] BLOK 3: Login page (`/login`) + Signup page (`/signup`)
- [x] BLOK 3: Zod validační schémata (české hlášky)
- [x] BLOK 3: Toaster (sonner) v root layout
- [x] BLOK 3: Auth middleware (redirect neauth → /login, auth → pryč z /login)
- [x] BLOK 4: Dashboard shell (DashboardShell — client wrapper pro Sheet stav)
- [x] BLOK 4: Sidebar (fixed w-64, navigace s active state, user section + logout)
- [x] BLOK 4: Header (sticky h-16, breadcrumb z pathname, hamburger pro mobil)
- [x] BLOK 4: Mobilní navigace (Sheet side="left", zavření po kliknutí na nav item)
- [x] BLOK 4: Auth confirm route (`/auth/confirm`) — PKCE flow (exchangeCodeForSession) + token_hash fallback
- [x] BLOK 4: Placeholder stránky — Dashboard `/`, Technický audit `/seo/technical-audit`, Nastavení `/settings`
- [x] BLOK 4: Signup emailRedirectTo pro správné přesměrování po potvrzení emailu

- [x] BLOK 4: Dashboard page — client cards grid (RSC, server-side fetch)
- [x] BLOK 4: ClientCard component + GET /api/clients endpoint
- [x] BLOK 4: Empty state, admin-only "Přidat klienta", completed job counts

- [x] BLOK 5: Client detail page (`/clients/[slug]`) — header, doména jako link, status badge
- [x] BLOK 5: Client detail tabs — Přehled (brand voice, poznámky, tým), SEO Jobs (tabulka), Nastavení (edit form + deaktivace, admin only)
- [x] BLOK 5: New client page (`/clients/new`) — admin only, Zod validace, auto slug
- [x] BLOK 5: Zod schéma pro klienty (`lib/validations/client.ts`)
- [x] BLOK 5: API routes — POST /api/clients, GET/PATCH/DELETE /api/clients/[id]
- [x] BLOK 5: Double layer security — admin check frontend + API + RLS

- [x] BLOK 6: GET /api/jobs?client_id=X — list jobů pro klienta (RLS, desc by created_at)
- [x] BLOK 6: POST /api/jobs — vytvoření jobu (CreateJobSchema + TechnicalAuditParamsSchema validace, timeout_at z JOB_TYPE_REGISTRY, audit_log)
- [x] BLOK 6: GET /api/jobs/[id] — detail jobu (RLS)
- [x] BLOK 6: POST /api/jobs/[id] action=cancel — zrušení jobu (stav check queued/running, 409 pro ostatní stavy, audit_log)
- [x] BLOK 6: useJobProgress hook — Supabase Realtime subscription (postgres_changes UPDATE na jobs tabulku, auto-cleanup na unmount)

- [x] BLOK 7: Migration 003 — `claim_next_job()` RPC funkce (FOR UPDATE SKIP LOCKED, atomic job claiming)
- [x] BLOK 7: Queue consumer (`queue/consumer.ts`) — pollForJob, updateProgress, completeJob, failJob (retry logika)
- [x] BLOK 7: Job handler registry (`jobs/registry.ts`) — registerHandler/getHandler + placeholder seo.technical-audit
- [x] BLOK 7: Worker entry point (`index.ts`) — poll loop 5s, timeout watchdog, 30s heartbeat, max 3 retries, pino logging, graceful shutdown (SIGTERM/SIGINT)

- [x] BLOK 8: Job launcher form (`components/jobs/job-launcher-form.tsx`) — client selector, doména (auto-fill z klienta), crawl depth (1-5), max pages (10/50/100/250/500), custom instructions, odhadovaný čas
- [x] BLOK 8: Technical audit page (`seo/technical-audit/page.tsx`) — RSC, fetches clients, renders launcher form
- [x] BLOK 8: Job progress card (`components/jobs/job-progress-card.tsx`) — useJobProgress hook, stavy queued/running/completed/failed/cancelled, elapsed timer, error detail refetch
- [x] BLOK 8: Job status page (`clients/[id]/jobs/[jobId]/page.tsx`) — RSC, fetches job + client, renders progress card
- [x] BLOK 8: Zod validace (`lib/validations/job.ts`) — jobLauncherSchema

- [x] BLOK 9: BFS crawler (`jobs/seo/technical-audit/crawler.ts`) — resolveBaseUrl, fetchRobotsTxt (robots-parser), fetchSitemapUrls (xml2js, sitemap index support), parsePage (cheerio, všechna CrawledPage pole), fetchPage (manual redirect tracking), Semaphore (max 5 concurrent), 200ms politeness, robots.txt respekt, progress callback

- [x] BLOK 9: PageSpeed Insights (`pagespeed.ts`) — selectUrlsForPageSpeed (homepage + top N by inlinks), runPageSpeed (mobile+desktop), CrUX field data preferováno, Lighthouse lab fallback, 1.1s rate limit, optional PSI_API_KEY

### Další kroky
- [ ] SEO audit handler — propojení crawleru + PageSpeed + analyzéry + AI compilation (nahradí placeholder v registry)
- [ ] Analyzéry (indexability, architecture, security, structured-data, on-page, aeo-geo, international)
- [ ] AI compilation (Claude Sonnet — executive summary, Impact/Effort scoring, akční plán)
- [ ] Job result viewer — zobrazení TechnicalAuditResult dat
- [ ] Aplikovat migraci 003 (`npm run db:migrate`)

### Známé gaps
- `.env.local` symlink (`apps/web/.env.local` → `../../.env.local`) — není v gitu, manuální setup
- Password reset flow — odloženo na post-MVP
- Keyword analýza (`/seo/keyword-analysis`) — disabled v nav, stránka zatím neexistuje
- Worker env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — musí být nastaveny v Railway
