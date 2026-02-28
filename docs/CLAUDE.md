# Project: agency_ops

## What is this?
Central operations platform for MacroConsulting digital marketing agency.
Modular tool platform ("AI colleagues") for the team. Client-centric architecture.

## Stack
Next.js 15 (App Router), TypeScript strict, Supabase (PostgreSQL + Auth + RLS + Realtime), Tailwind v4, shadcn/ui, Railway (job workers), Vercel (frontend hosting), Turborepo monorepo.

## Monorepo Structure
- `apps/web` – Next.js frontend (→ Vercel)
- `workers/job-runner` – Background job worker (→ Railway Docker)
- `packages/shared` – Shared types, constants, Zod schemas

## Commands
- `npm run dev` – dev server (turbo, runs web + worker)
- `npm run dev:web` – frontend only
- `npm run dev:worker` – worker only
- `npm run build` – build all
- `npm run lint` – eslint + prettier
- `npm run test` – vitest
- `npm run db:migrate` – supabase migration
- `npm run db:reset` – reset local Supabase
- `npm run db:types` – generate TypeScript types from Supabase schema

## Steering Documents (READ BEFORE ANY IMPLEMENTATION)
@docs/project_goal.md – Business objective, users, acceptance criteria
@docs/tech.md – Stack, architecture, directory structure, rules
@docs/libraries.md – DB schema, API endpoints, external contracts
@docs/design.md – Design tokens (primary: #F18B32 orange, secondary: #005A87 blue, font: Poppins), layout, component rules

## Iron Rules
1. ALL client data behind Supabase RLS. NEVER bypass with service_role on frontend.
2. API keys ONLY in env vars. NEVER in code, NEVER in CLAUDE.md, NEVER in DB.
3. Job worker: max 3 retries, then STOP. NEVER infinite retry loop.
4. Max 5 concurrent requests to any target domain (politeness).
5. Every job MUST report progress at least every 30 seconds.
6. No direct SQL from frontend – use Supabase client library.
7. TypeScript strict mode. No `any` types without explicit justification comment.
8. All dates: UTC in DB, local timezone in UI.
9. Commit format: type(scope): description (conventional commits).

## Security
- .env files in .gitignore
- No console.log with sensitive data
- Rate limiting on all public API endpoints
- Audit log for all job executions

## Active Sub-agents (for Claude Code development)
- code-reviewer: Reviews for security, performance, RLS compliance (model: sonnet)
- implementer: Builds features per steering docs (model: sonnet)

## Architecture Decision Log
@.claude/memory/decisions.md
