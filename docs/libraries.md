# Libraries & API Contracts: agency_ops

## Supabase Database Schema

### Table: clients
Primary entity. Every Job, report, and data point is scoped to a client.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | |
| name | text | NOT NULL | Client display name |
| domain | text | | Primary website domain (e.g. "example.com") |
| slug | text | UNIQUE, NOT NULL | URL-safe identifier |
| brand_voice | text | | Tone/style notes for content generation |
| notes | text | | General notes, context, business goals |
| google_drive_folder_id | text | | Google Shared Drive folder ID (budoucí) |
| slack_channel_id | text | | Slack channel ID (budoucí) |
| is_active | boolean | DEFAULT true | Soft delete / archive |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |
| created_by | uuid | FK → auth.users.id | Who added this client |

**RLS Policy:** Users see only clients they are assigned to (via client_members join table).

### Table: client_members
Many-to-many: which team members can access which clients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | |
| client_id | uuid | FK → clients.id, NOT NULL | |
| user_id | uuid | FK → auth.users.id, NOT NULL | |
| role | text | DEFAULT 'member' | 'admin' \| 'member' |
| created_at | timestamptz | DEFAULT now() | |

**UNIQUE constraint:** (client_id, user_id)
**RLS Policy:** User sees their own memberships. Admin can manage all.

### Table: jobs
Every Job execution is a record. This is the job queue AND history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | |
| client_id | uuid | FK → clients.id, NOT NULL | Scoped to client |
| job_type | text | NOT NULL | Registry key (e.g. "seo.technical-audit") |
| status | text | NOT NULL, DEFAULT 'queued' | 'queued' \| 'running' \| 'completed' \| 'failed' \| 'cancelled' |
| params | jsonb | DEFAULT '{}' | Job-specific input parameters |
| progress | integer | DEFAULT 0 | 0-100 progress percentage |
| progress_message | text | | Human-readable progress status |
| result | jsonb | | Job output (report data) |
| error | jsonb | | Error details if failed |
| retry_count | integer | DEFAULT 0 | Number of retries attempted |
| started_at | timestamptz | | When worker picked up the job |
| completed_at | timestamptz | | When job finished (success or fail) |
| timeout_at | timestamptz | | Deadline – worker must finish by this time |
| created_at | timestamptz | DEFAULT now() | |
| created_by | uuid | FK → auth.users.id, NOT NULL | Who triggered the job |

**RLS Policy:** User sees jobs for clients they're a member of.
**Index:** (status, created_at) for queue polling by worker.

### Table: profiles
Extended user profile (Supabase Auth handles core auth).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, FK → auth.users.id | |
| full_name | text | | Display name |
| avatar_url | text | | Profile picture URL |
| role | text | DEFAULT 'member' | 'admin' \| 'member' (platform-level role) |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

### Table: audit_log
Immutable log of all significant actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | |
| user_id | uuid | FK → auth.users.id | Who performed the action |
| client_id | uuid | FK → clients.id | Which client context (nullable for system events) |
| action | text | NOT NULL | e.g. "job.created", "job.completed", "client.updated" |
| metadata | jsonb | DEFAULT '{}' | Action-specific data |
| created_at | timestamptz | DEFAULT now() | |

**RLS Policy:** Admins can read all. Members can read logs for their clients.

## API Endpoints (Next.js API Routes)

### Authentication
Handled by Supabase Auth client-side SDK. No custom auth endpoints needed.

**Auth pages:** `/login`, `/signup` — client-side forms, Supabase `signInWithPassword` / `signUp`.
- Signup posílá `full_name` v `options.data` → DB trigger `handle_new_user()` vytvoří profil.
- Signup nastavuje `emailRedirectTo` → `${origin}/auth/confirm` (PKCE flow).
- Validace: Zod schemas v `apps/web/src/lib/validations/auth.ts` (české hlášky).
- Po signup → redirect na `/login?message=check-email`.

**Email confirmation route:** `GET /auth/confirm`
- Supabase po kliknutí na potvrzovací odkaz redirectne na `/auth/confirm?code=xxx` (PKCE flow).
- Route handler: `exchangeCodeForSession(code)` → redirect na `/`.
- Fallback: `verifyOtp({ token_hash, type })` pro token_hash flow.
- Při chybě → redirect na `/login?message=confirm-error`.
- Route je v middleware `publicPaths` (nevyžaduje auth).

### Clients
```
GET    /api/clients                    → List clients (filtered by user membership)
POST   /api/clients                    → Create client (admin only)
GET    /api/clients/[id]               → Get client detail
PATCH  /api/clients/[id]               → Update client
DELETE /api/clients/[id]               → Soft delete (set is_active=false)
```

### Client Members
```
GET    /api/clients/[id]/members       → List members for client
POST   /api/clients/[id]/members       → Add member to client (admin only)
DELETE /api/clients/[id]/members/[uid] → Remove member (admin only)
```

### Jobs
```
GET    /api/jobs?client_id=X           → List jobs for client
POST   /api/jobs                       → Create (queue) new job
GET    /api/jobs/[id]                  → Get job status + results
POST   /api/jobs/[id]/cancel           → Cancel running job
```

### Job Creation Payload
```typescript
// POST /api/jobs
{
  client_id: string;          // UUID
  job_type: "seo.technical-audit" | "seo.keyword-analysis";  // extensible
  params: {
    // For seo.technical-audit:
    domain: string;           // e.g. "example.com"
    crawl_depth: number;      // 1-5 (default 3)
    max_pages: number;        // default 100
    custom_instructions?: string;  // user notes for AI analysis
    
    // For seo.keyword-analysis (MVP 1.2):
    // TBD
  }
}
```

### Job Result Schema (seo.technical-audit)
```typescript
interface TechnicalAuditResult {
  summary: {
    total_pages_crawled: number;
    total_issues: number;
    critical_count: number;
    warning_count: number;
    info_count: number;
    overall_score: number;        // 0-100
    crawl_duration_ms: number;
  };
  categories: {
    performance: CategoryResult;
    indexability: CategoryResult;
    meta_tags: CategoryResult;
    structured_data: CategoryResult;
    mobile_friendliness: CategoryResult;
    core_web_vitals: CategoryResult;
    internal_linking: CategoryResult;
    broken_links: CategoryResult;
    redirects: CategoryResult;
    sitemap_robots: CategoryResult;
    security: CategoryResult;     // HTTPS, mixed content
  };
  pages: PageResult[];            // Per-page details
  ai_recommendations: string;    // AI-generated summary & action items
}

interface CategoryResult {
  score: number;                  // 0-100
  issues: Issue[];
}

interface Issue {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affected_urls: string[];
  recommendation: string;
}

interface PageResult {
  url: string;
  status_code: number;
  title: string;
  meta_description: string;
  h1: string[];
  load_time_ms: number;
  content_length: number;
  issues: Issue[];
}
```

### CrawledPage (worker internal data model)

Defined in `packages/shared/src/types/seo.ts`. Full crawler output per page.
Source: `seo-technical-audit-blueprint.md` section 3.1.

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
  metaRobots: string | null;
  xRobotsTag: string | null;
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
  brokenLinks: string[];

  // Images
  images: ImageData[];                 // [{src, alt, width, height, sizeKb, format}]

  // Structured Data
  jsonLd: object[];
  microdata: object[];

  // JS rendering (if applicable)
  jsRenderDiff: {
    contentDiffPercent: number;
    linksOnlyInRendered: number;
  } | null;

  // Timing
  crawledAt: string;                   // ISO timestamp
  crawlDepth: number;
}
```

## External API Contracts

### Anthropic API (Claude)
- Used by: Railway worker (AI analysis & report generation)
- Model: claude-sonnet-4-6 (default for SEO analysis)
- Auth: Bearer token via ANTHROPIC_API_KEY
- Rate limits: Respect Anthropic rate limits, implement exponential backoff

### Supabase Realtime
- Used by: Frontend (subscribe to job progress updates)
- Channel: `jobs:client_id={client_id}`
- Events: progress_update, status_change

### Google PageSpeed Insights API (budoucí alternativa k Lighthouse CLI)
- Endpoint: https://www.googleapis.com/pagespeedonline/v5/runPagespeed
- Free tier: 25,000 requests/day
- Used for: Core Web Vitals, Performance score

### Budoucí integrace (mimo MVP, ale reservuj v schema)
- Google Search Console API (indexability data)
- Google Ads API (Reporting modul)
- Sklik API (Reporting modul)
- Meta Marketing API (Reporting modul)
- Slack API (notifications, approvals)
- Google Drive API (document sync)

## NPM Dependencies (key packages)

### apps/web (installed)
```
next ^15, react ^19, react-dom ^19
@supabase/supabase-js ^2, @supabase/ssr ^0
tailwindcss ^4, @tailwindcss/postcss ^4
shadcn/ui (radix-ui, class-variance-authority, clsx, tailwind-merge, tw-animate-css)
  → components: button, card, input, label, textarea, select, badge, dialog,
    dropdown-menu, separator, skeleton, table, tabs, progress, sonner (replaces toast),
    tooltip, avatar, sheet
zustand ^5
react-hook-form ^7, @hookform/resolvers ^3, zod ^3
date-fns ^4
lucide-react ^0.468
```

### workers/job-runner (installed)
```
@supabase/supabase-js ^2
@anthropic-ai/sdk ^0
playwright ^1 (headless Chrome for crawling)
cheerio ^1 (HTML parsing)
robots-parser ^3 (robots.txt parsing)
xml2js ^0.6 (sitemap.xml parsing – replaces sitemap-parser)
zod ^3 (validation)
pino ^9 (structured logging)
```

### packages/shared (installed)
```
zod ^3 (shared Zod schemas + inferred TypeScript types)
typescript ^5
```

## Conventions

- All Supabase queries use TypeScript generated types (`supabase gen types typescript`)
- All API responses follow shape: `{ data: T } | { error: { message: string, code: string } }`
- All dates stored as UTC timestamptz, displayed in user's local timezone
- Job params and results validated with Zod schemas (shared package)
- Worker logs structured JSON (pino) for Railway log aggregation
