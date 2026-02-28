# Active Plan — Agency Ops

## Aktuální stav: BLOK 4 — Dashboard Layout (hotovo)

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

### Další kroky
- [ ] Client list page (dashboard overview s přiřazenými klienty)
- [ ] Client detail page (`/clients/[id]`)
- [ ] Job queue UI (spuštění jobu, progress, výsledky)
- [ ] SEO audit job — worker pipeline

### Známé gaps
- `.env.local` symlink (`apps/web/.env.local` → `../../.env.local`) — není v gitu, manuální setup
- Password reset flow — odloženo na post-MVP
- Keyword analýza (`/seo/keyword-analysis`) — disabled v nav, stránka zatím neexistuje
