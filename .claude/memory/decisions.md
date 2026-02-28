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
