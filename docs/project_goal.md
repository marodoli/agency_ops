# Project Goal: agency_ops

## Business Objective

Centrální operační platforma pro tým MacroConsulting – digitální marketingová agentura (full-service: PPC, SEO, sociální sítě, analytika, emailing, grafika, zbožové srovnávače, strategie).

Platforma postupně nahrazuje manuální, repetitivní činnosti sadou modulárních nástrojů ("AI kolegů"), které může každý přihlášený člen týmu spouštět on-demand. Každý nástroj (Job) pracuje v kontextu konkrétního klienta agentury.

## Core Principle

**Klient = centrum všeho.** Každý Job, každý výstup, každý kontext je vázán na konkrétního klienta. Data klienta A NIKDY nesmí být přístupná v kontextu klienta B. Toto je iron rule #1 celé platformy.

## Users & Roles

- **Agency Member (default):** Přihlášený člen týmu MacroConsulting. Může spouštět Jobs, vidí výstupy pro klienty, ke kterým má přístup. Nemůže měnit systémová nastavení.
- **Admin:** Správce platformy. Může přidávat/odebírat uživatele, spravovat klienty, konfigurovat Jobs, nastavovat API klíče a limity.
- **Viewer (budoucí):** Read-only přístup pro klienty agentury k jejich reportům (mimo MVP scope).

## MVP Scope (v1.0)

### Platformní základ
- Autentizace: email + heslo (Supabase Auth)
- Klientský registr: seznam klientů agentury s metadaty (doména, brand voice, poznámky, Google Drive folder ID, Slack channel)
- Dashboard: přehled klientů, přístup k modulům
- Job runner: spuštění Jobu s parametry, sledování progressu, zobrazení výsledků

### Modul: SEO
- **Job 1.1: Technická SEO analýza webu (MVP 1.1)**
  - Vstup: doména klienta, hloubka crawlu, custom instructions
  - Výstup: strukturovaný report technických SEO issues
  - Detail pipeline: DEFINUJEME PO DODÁNÍ MANUÁLNÍHO PROCESU DOKUMENTU

- **Job 1.2: Analýza klíčových slov (MVP 1.2)**
  - Definujeme v dalším kroku

## Budoucí moduly (mimo MVP, ale architektura musí počítat)

1. **Content** – content scraper, trend analysis, doporučovatel témat, návrhy textací/scénářů
2. **Reporting** – napojení na Google Ads, Sklik, Meta Ads API; stahování dat, blending, insights
3. **Scraping** – obecný scraping toolkit pro ad-hoc úkoly
4. **Market Research** – konkurenční analýza, trend monitoring

## Budoucí capability: Background Agents
Časem budou Jobs nejen on-demand, ale i scheduled/autonomní. Platforma bude sloužit jako control panel pro agenty běžící na pozadí – nastavení pravidel, kontextu, token limitů. Architektura musí toto umožnit bez zásadního refactoringu.

## Integrace (plánované)

- **Google Workspace (Shared Drive):** Každý klient má svou složku. Agent čte/zapisuje dokumenty.
- **Slack:** Každý klient má svůj kanál. Notifikace o dokončených Jobs, schvalovací flow.
- **MacroConsulting jako vlastní klient:** Interní projekty (vlastní SEO, social media) běží stejným pipeline.

## Acceptance Criteria (platformní základ)

- WHEN user logs in, THEN they see client dashboard with list of assigned clients
- WHEN user selects client, THEN they see available Jobs for that client's context
- WHEN user starts a Job, THEN they can configure parameters (domain, depth, notes)
- WHEN Job is running, THEN user sees real-time progress indicator
- WHEN Job completes, THEN structured report is displayed and stored
- WHEN Job fails, THEN user sees clear error message with actionable info
- THE SYSTEM SHALL NOT expose data of client A to users who only have access to client B
- THE SYSTEM SHALL enforce row-level security on all client data

## Acceptance Criteria (MVP 1.1 – Technická SEO analýza)

- WHEN user enters domain and starts analysis, THEN system crawls the site to configured depth
- WHEN crawl completes, THEN system analyzes technical SEO factors (performance, indexability, meta tags, structured data, mobile-friendliness, Core Web Vitals, internal linking, broken links, redirects, sitemap/robots.txt)
- WHEN analysis completes, THEN report categorizes issues by severity (Critical / Warning / Info)
- WHEN report is ready, THEN user can view it in-app AND export as PDF/Google Doc
- THE SYSTEM SHALL complete analysis of a 100-page site within 15 minutes
- THE SYSTEM SHALL NOT make more than 5 concurrent requests to target domain (politeness)

## Security Constraints

- All API keys stored in environment variables, NEVER in code or DB
- Supabase RLS active on ALL tables containing client data
- Job workers run in isolated Railway containers
- Rate limiting on all public endpoints
- Audit log for all Job executions (who, when, what client, what params)
