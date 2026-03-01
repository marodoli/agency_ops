# Tech Stack & Structure: agency_ops

## Architecture Overview

**Topologie:** Star (Vercel frontend → Railway background worker → Supabase state store)

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   VERCEL (Frontend)  │     │  RAILWAY (Workers)   │     │  SUPABASE (Backend)  │
│                      │     │                      │     │                      │
│  Next.js 15 App      │────▶│  Job Worker Service  │────▶│  PostgreSQL + RLS    │
│  API Routes (light)  │     │  (Docker/Node.js)    │     │  Auth (email+pass)   │
│  shadcn/ui + custom  │     │                      │     │  Realtime (progress) │
│  tokens              │◀────│  Headless Chrome     │◀────│  Storage (reports)   │
│                      │     │  Lighthouse CLI       │     │  pgvector (budoucí)  │
└──────────────────────┘     │  SEO analysis tools  │     └──────────────────────┘
                             └──────────────────────┘
```

**Data flow pro Job execution:**
1. User klikne "Spustit analýzu" → Next.js API route vytvoří job record v Supabase (status: queued)
2. Railway worker polluje job queue (nebo Supabase Realtime subscription)
3. Worker provede crawl + analýzu → průběžně updatuje progress v Supabase
4. Frontend dostává progress přes Supabase Realtime → zobrazuje uživateli
5. Worker dokončí → uloží výsledky → status: completed
6. Frontend zobrazí report

## Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend framework | Next.js | 15 (App Router) | SSR, routing, API routes |
| Language | TypeScript | strict mode | Type safety across entire codebase |
| UI components | shadcn/ui | latest (New York, slate) | Base component library |
| Styling | Tailwind CSS | v4 (CSS-first config) | Utility-first CSS + custom design tokens |
| Database | Supabase (PostgreSQL) | latest | Primary data store + RLS |
| Auth | Supabase Auth | latest | Email + password authentication |
| Realtime | Supabase Realtime | latest | Job progress streaming |
| Job worker | Railway (Docker) | Node.js 22 LTS | Long-running SEO analysis jobs |
| Frontend hosting | Vercel | latest | Edge CDN, preview deploys |
| State management | Zustand | ^5 | Client-side state (lightweight) |
| Form handling | React Hook Form + Zod | ^7 + ^3 | Validation, form state |
| Date handling | date-fns | ^4 | Date formatting (lightweight) |
| Crawler | Playwright + cheerio | ^1 | Headless Chrome + fast HTML parsing |
| Sitemap parsing | xml2js | ^0.6 | sitemap.xml parsing (replaces sitemap-parser) |
| Robots.txt | robots-parser | ^3 | robots.txt rule parsing |
| Logging | pino | ^9 | Structured JSON logging (Railway) |
| AI SDK | @anthropic-ai/sdk | ^0 | Claude API for report generation |
| Notifications | sonner | latest | Toast notifications (replaces shadcn toast) |

## Model Tiering (AI costs)

| Task | Model | Rationale |
|------|-------|-----------|
| SEO issue analysis & categorization | claude-sonnet-4-6 | Rutinní klasifikace, stačí Sonnet |
| Report generation & recommendations | claude-sonnet-4-6 | Strukturovaný výstup |
| Budoucí: strategická doporučení | claude-opus-4-6 | Komplexní reasoning |
| Budoucí: content generation | claude-sonnet-4-6 | Volume práce, cost-effective |

## Directory Structure

```
agency_ops/
├── apps/
│   └── web/                          # Next.js frontend (Vercel)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/           # Login, signup, forgot password
│       │   │   │   ├── login/
│       │   │   │   └── signup/
│       │   │   ├── (dashboard)/      # Protected routes (require auth)
│       │   │   │   ├── layout.tsx    # Sidebar + header layout
│       │   │   │   ├── page.tsx      # Client list / overview
│       │   │   │   ├── clients/
│       │   │   │   │   ├── [id]/
│       │   │   │   │   │   ├── page.tsx        # Client detail + available Jobs
│       │   │   │   │   │   └── jobs/
│       │   │   │   │   │       └── [jobId]/
│       │   │   │   │   │           └── page.tsx # Job results view
│       │   │   │   │   └── new/
│       │   │   │   │       └── page.tsx        # Add new client
│       │   │   │   ├── seo/
│       │   │   │   │   ├── technical-audit/
│       │   │   │   │   │   └── page.tsx        # MVP 1.1 - Tech SEO Job launcher
│       │   │   │   │   └── keyword-analysis/
│       │   │   │   │       └── page.tsx        # MVP 1.2 (placeholder)
│       │   │   │   └── settings/
│       │   │   │       └── page.tsx            # Admin: users, API keys, config
│       │   │   ├── api/
│       │   │   │   ├── jobs/
│       │   │   │   │   ├── route.ts            # POST: create job, GET: list jobs
│       │   │   │   │   └── [id]/
│       │   │   │   │       ├── route.ts        # GET: job status + results
│       │   │   │   │       └── pdf/
│       │   │   │   │           └── route.tsx   # GET: export job as PDF
│       │   │   │   └── clients/
│       │   │   │       └── route.ts            # CRUD for clients
│       │   │   ├── layout.tsx
│       │   │   └── globals.css
│       │   ├── components/
│       │   │   ├── ui/               # shadcn/ui components (auto-generated)
│       │   │   ├── layout/           # Sidebar, Header, Navigation
│       │   │   ├── clients/          # Client cards, client forms
│       │   │   ├── jobs/             # Job launcher, progress, results
│       │   │   └── seo/              # SEO-specific report components
│       │   ├── lib/
│       │   │   ├── supabase/
│       │   │   │   ├── client.ts     # Browser Supabase client
│       │   │   │   ├── server.ts     # Server-side Supabase client
│       │   │   │   └── middleware.ts # Auth middleware for protected routes
│       │   │   ├── utils.ts          # Shared utilities
│       │   │   ├── pdf/              # PDF generation (server-side)
│       │   │   │   ├── fonts.ts     # Poppins + JetBrains Mono registration
│       │   │   │   └── seo-report-pdf.tsx  # SEO audit PDF document
│       │   │   └── validations/      # Zod schemas
│       │   ├── hooks/                # Custom React hooks
│       │   └── types/                # Shared TypeScript types
│       ├── tailwind.config.ts        # Custom MacroConsulting design tokens
│       ├── next.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                       # Shared types, constants, utils
│       ├── src/
│       │   ├── types/
│       │   │   ├── client.ts         # Client data model types
│       │   │   ├── job.ts            # Job data model types
│       │   │   └── seo.ts            # SEO-specific types
│       │   ├── constants/
│       │   │   └── job-types.ts      # Job type registry
│       │   └── utils/
│       └── package.json
│
├── workers/
│   └── job-runner/                   # Railway worker service
│       ├── src/
│       │   ├── index.ts              # Worker entry: poll queue, dispatch jobs
│       │   ├── queue/
│       │   │   └── consumer.ts       # Job queue consumer (Supabase-based)
│       │   ├── jobs/
│       │   │   ├── registry.ts       # Job type → handler mapping
│       │   │   └── seo/
│       │   │       ├── technical-audit/
│       │   │       │   ├── handler.ts    # Main job handler
│       │   │       │   ├── crawler.ts    # Site crawler
│       │   │       │   ├── analyzers/    # Individual check modules
│       │   │       │   │   ├── meta-tags.ts
│       │   │       │   │   ├── performance.ts
│       │   │       │   │   ├── indexability.ts
│       │   │       │   │   ├── links.ts
│       │   │       │   │   ├── structured-data.ts
│       │   │       │   │   ├── mobile.ts
│       │   │       │   │   └── core-web-vitals.ts
│       │   │       │   └── report-generator.ts  # Compile results into report
│       │   │       └── keyword-analysis/ # MVP 1.2 (placeholder)
│       │   ├── lib/
│       │   │   ├── supabase.ts       # Worker Supabase client (service role)
│       │   │   ├── ai.ts             # Anthropic API client wrapper
│       │   │   └── browser.ts        # Playwright/headless Chrome setup
│       │   └── utils/
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── supabase/
│   ├── migrations/                   # SQL migrations (versioned)
│   ├── seed.sql                      # Dev seed data
│   └── config.toml                   # Supabase local dev config
│
├── docs/                             # Steering documents
│   ├── project_goal.md
│   ├── tech.md                       # THIS FILE
│   ├── libraries.md
│   ├── design.md
│   └── decisions.md              # → lives in .claude/memory/decisions.md
│
├── .env.example                      # Template for env vars
├── .gitignore
├── package.json                      # Root workspace config
├── turbo.json                        # Turborepo config (monorepo)
└── README.md
```

## Monorepo Strategy

Turborepo monorepo se 3 workspaces:
- `apps/web` – Next.js frontend (deploys to Vercel)
- `workers/job-runner` – Job execution worker (deploys to Railway)
- `packages/shared` – Shared types, constants, utils

Důvod: Frontend a worker sdílí typy (Client, Job, SEO report schema). Monorepo = single source of truth pro typy.

## Rules

### Code Style
- TypeScript strict mode everywhere
- ESLint + Prettier (auto-format on save)
- Functional components only (no class components)
- Named exports (no default exports except pages)
- File naming: kebab-case for files, PascalCase for components

### Data Access
- ALL client data access through Supabase RLS – NEVER bypass with service_role on frontend
- Worker uses service_role key but ALWAYS filters by client_id from job record
- No direct SQL from frontend – use Supabase client library
- All API routes require auth middleware

### Security
- API keys ONLY in environment variables (.env.local / Railway env / Vercel env)
- NEVER log API keys, tokens, or client data to console
- NEVER commit .env files (.gitignore enforced)
- Rate limit all public API endpoints
- Audit log for all job executions

### Job Execution
- Every job has a timeout (configurable, default 15 min)
- Every job reports progress to Supabase (min every 30 seconds)
- Failed jobs store error details for debugging
- Max 3 retry attempts per job, then STOP and report
- Politeness: max 5 concurrent requests to any single target domain

### Git Workflow
- Main branch: `main` (protected, requires PR)
- Feature branches: `feat/description`
- Bug fixes: `fix/description`
- Commit format: `type(scope): description` (conventional commits)

## Active MCP Servers (for Claude Code development)

| Server | Purpose | Active |
|--------|---------|--------|
| github | PR management, issues | ✅ |
| supabase | DB management, migrations | ✅ |
| filesystem | File operations | ✅ |
| vercel | Deploy management | ✅ |

Max 10 active per project. Add more only when needed.

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Worker only, NEVER on frontend

# Anthropic (for AI analysis in worker)
ANTHROPIC_API_KEY=

# Railway (worker config)
JOB_POLL_INTERVAL_MS=5000
JOB_MAX_TIMEOUT_MS=900000           # 15 min default
MAX_CONCURRENT_JOBS=3

# Budoucí integrace
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# SLACK_BOT_TOKEN=
# SLACK_SIGNING_SECRET=
```
