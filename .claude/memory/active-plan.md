# Active Plan — Agency Ops

## Aktuální stav: BLOK 3 — Auth UI (probíhá)

### Hotovo
- [x] BLOK 1: DB schema + RLS policies + helper funkce
- [x] BLOK 2: Seed data, Supabase clients (browser + server + middleware), generated DB types
- [x] BLOK 2: Design tokens (globals.css), 18 shadcn/ui komponent
- [x] BLOK 3: Login page (`/login`) + Signup page (`/signup`)
- [x] BLOK 3: Zod validační schémata (české hlášky)
- [x] BLOK 3: Toaster (sonner) v root layout
- [x] BLOK 3: Auth middleware (redirect neauth → /login, auth → pryč z /login)

### Další kroky
- [ ] Dashboard layout (sidebar + header + content area)
- [ ] Client list page
- [ ] Job queue UI
- [ ] SEO audit job — worker pipeline

### Známé gaps
- `.env.local` symlink (`apps/web/.env.local` → `../../.env.local`) — není v gitu, manuální setup
- Password reset flow — odloženo na post-MVP
- Email verification callback route — závisí na Supabase email config
