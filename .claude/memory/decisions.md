# Architecture Decisions: agency_ops

## Decision Log

### ADR-001: Vercel + Railway hybrid (2026-02-28)
**Decision:** Frontend on Vercel, job workers on Railway, DB on Supabase.
**Context:** Need serverless-fast frontend + long-running job capability (SEO crawls = minutes, not seconds).
**Alternatives considered:**
- Vercel-only + Inngest: Simpler but serverless memory limits could block heavy crawls.
- Railway-only: Loses Vercel's edge CDN and Next.js optimization.
**Trade-off:** Two deployment targets (more DevOps) in exchange for optimal runtime for each workload.

### ADR-002: Supabase-based job queue (2026-02-28)
**Decision:** Use Supabase `jobs` table as job queue instead of Redis/BullMQ.
**Context:** For MVP volume (< 100 jobs/day), dedicated queue infrastructure is overkill.
**Alternatives considered:**
- BullMQ + Redis on Railway: More robust, but adds infrastructure complexity.
- Inngest: SaaS, but adds vendor dependency.
**Trade-off:** Simpler infra now. If we hit scale issues (> 1000 jobs/day), migrate to BullMQ.
**Migration path:** Queue consumer interface is abstracted – swap implementation without changing job handlers.

### ADR-003: Turborepo monorepo (2026-02-28)
**Decision:** Single repo with Turborepo for frontend + worker + shared packages.
**Context:** Frontend and worker share types (Client, Job, Report schemas). Monorepo = single source of truth.
**Trade-off:** Slightly more complex initial setup. Pays off immediately in type safety.

### ADR-004: Design level Ú2 – custom tokens, no Figma (2026-02-28)
**Decision:** shadcn/ui + custom MacroConsulting design tokens via JSONC brief pipeline.
**Context:** Internal agency tool – needs to look professional but not pixel-perfect.
**Trade-off:** 80% visual quality for 20% design investment.

### ADR-005: Email + password auth (2026-02-28)
**Decision:** Supabase Auth with email + password. No SSO for MVP.
**Context:** Simple, no external OAuth setup needed. Team is small.
**Migration path:** Supabase Auth supports adding Google OAuth later without schema changes.

### ADR-006: Brand colors orange + dark blue, Poppins font (2026-02-28)
**Decision:** Primary #F18B32 (orange), Secondary #005A87 (dark blue), Font: Poppins.
**Context:** Colors provided by client (MacroConsulting brand). Poppins chosen for modern, rounded feel that pairs well with agency branding. Full 10-step color scale generated for both primary and secondary.
**Rejected:** Previously derived yellow (#F5C518) + navy (#1A1A2E) from website analysis – replaced with actual brand colors. Inter font replaced by Poppins per client preference.

### ADR-007: Tailwind CSS v4 CSS-first config (2026-02-28)
**Decision:** Tailwind v4 s `@tailwindcss/postcss`. Tokeny v `globals.css` přes `@theme`, žádný `tailwind.config.ts`.
**Context:** Tailwind v4 přešel na CSS-first konfiguraci. shadcn/ui v4 kompatibilita potvrzena.
**Consequences:** Design tokeny z design.md se mapují na CSS custom properties přímo v globals.css.

### ADR-008: sonner místo shadcn/ui toast (2026-02-28)
**Decision:** Použít `sonner` pro toast notifikace.
**Context:** shadcn/ui deprecated komponentu `toast` ve prospěch `sonner`.
**Consequences:** Jednodušší API (`toast("Message")`). 18 shadcn komponent nainstalováno s sonner místo toast.

### ADR-009: xml2js místo sitemap-parser (2026-02-28)
**Decision:** `xml2js ^0.6` pro sitemap.xml parsing.
**Context:** `sitemap-parser` (z původního plánu) má omezené API. `xml2js` zvládne i nestandardní sitemapy.
**Consequences:** `@types/xml2js` v devDependencies workeru.

### ADR-010: RLS helper funkce is_admin() a is_member_of() (2026-02-28)
**Decision:** `security definer` helper funkce pro RLS policies místo inline subqueries.
**Context:** 20 RLS policies na 5 tabulkách opakovaně kontrolují admin role a client membership.
**Consequences:** DRY policies, snadnější audit. Migrace 002 dropla policies z 001 a vytvořila nové s helpers.

### ADR-011: Zod schemas jako single source of truth pro typy (2026-02-28)
**Decision:** Zod schemas v `packages/shared` s `z.infer<>` pro TypeScript typy.
**Context:** Typy potřebné compile-time (TypeScript) i runtime (API/job params validace).
**Consequences:** Žádná duplicita. Frontend i worker importují ze shared. DB schema = structure, Zod = validation.

### ADR-012: Auth forms — React Hook Form + Zod, client-side (2026-02-28)
**Decision:** Login/signup jako client components s `react-hook-form` + `zodResolver`. Supabase auth volání přímo z browseru.
**Context:** Supabase JS SDK je navržený pro client-side auth. Server Actions by přidaly zbytečnou vrstvu.
**Alternatives considered:**
- Next.js Server Actions: Přidává indirection, Supabase browser client je jednodušší.
- Uncontrolled forms (bez RHF): Méně boilerplatu, ale horší UX pro inline validaci.
**Consequences:** Auth forms jsou plně client-side. Middleware (`updateSession`) řeší cookie refresh.

### ADR-013: PKCE email confirmation via /auth/confirm route (2026-03-01)
**Decision:** Route handler `GET /auth/confirm` exchanguje PKCE code za session. Fallback na verifyOtp pro token_hash flow.
**Context:** Supabase SSR používá PKCE flow — po kliknutí na potvrzovací email Supabase redirectne s `?code=xxx`. Bez route handleru se token nevymění a login selže ("Invalid login credentials").
**Consequences:** `/auth/confirm` v middleware publicPaths. Signup nastavuje `emailRedirectTo` na `${origin}/auth/confirm`.

### ADR-014: DashboardShell jako jediný "use client" wrapper (2026-03-01)
**Decision:** Jeden `DashboardShell` client component řídí Sheet open/close stav sdílený mezi Header (hamburger) a Sheet (sidebar).
**Context:** Sheet stav musí být sdílený — hamburger v Header otevírá, klik na nav item v Sheet zavírá. Místo context/zustand stačí jeden useState v parent komponentě.
**Alternatives considered:**
- Zustand store: Overkill pro jeden boolean stav.
- React Context: Zbytečná abstrakce pro lokální UI stav.
**Consequences:** Sidebar i Header jsou "use client" (potřebují usePathname), ale layout.tsx zůstává server component pro data fetching.

### ADR-015: Client detail route [id] = slug, ne UUID (2026-03-01)
**Decision:** Route `/clients/[id]` přijímá slug (ne UUID). ClientCard linkuje přes slug pro hezčí URL.
**Context:** Slug je UNIQUE v DB, uživatelsky přívětivější v URL baru. UUID by bylo technicky korektní ale ošklivé.
**Consequences:** Page query: `.eq("slug", slug)`. Slug se auto-generuje při POST z názvu (NFD normalize → kebab-case).

### ADR-016: Double layer security pro admin operace (2026-03-01)
**Decision:** Admin check na 3 úrovních: frontend (redirect/skrytí UI), API route (profiles.role check), Supabase (RLS policies).
**Context:** Frontend check je UX (neobtěžuj non-adminy formuláři). API check je autorizace. RLS je safety net.
**Consequences:** Každá PATCH/DELETE/POST operace na klientech kontroluje `profiles.role === "admin"` v API route. RLS pak filtruje i to, co admin vidí (jen své klienty).

### ADR-017: claim_next_job RPC pro atomický job claim (2026-03-01)
**Decision:** PostgreSQL funkce `claim_next_job()` s `FOR UPDATE SKIP LOCKED` pro atomické přiřazení jobu workerovi.
**Context:** Supabase JS client nepodporuje `FOR UPDATE SKIP LOCKED`. Bez atomického claimu hrozí double pickup při více workerech.
**Alternatives considered:**
- Two-step SELECT + UPDATE s WHERE check: race condition window, méně spolehlivé.
- Redis/BullMQ: overkill pro MVP volume (ADR-002).
**Consequences:** Migrace 003. Worker volá `supabase.rpc("claim_next_job")`. Funkce vrací 0 nebo 1 řádek (claimed job). SECURITY DEFINER, worker používá service_role key.
