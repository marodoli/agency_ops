# Active Plan — Agency Ops

## Aktuální stav: BLOK 6 — Job API + Realtime (hotovo)

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

### Další kroky
- [ ] Job queue UI — formulář pro spuštění jobu, progress bar s realtime updaty, výsledky
- [ ] SEO audit job — worker pipeline (crawler + analyzer + report generator)
- [ ] Job result viewer — zobrazení TechnicalAuditResult dat

### Známé gaps
- `.env.local` symlink (`apps/web/.env.local` → `../../.env.local`) — není v gitu, manuální setup
- Password reset flow — odloženo na post-MVP
- Keyword analýza (`/seo/keyword-analysis`) — disabled v nav, stránka zatím neexistuje
