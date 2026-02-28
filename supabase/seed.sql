-- seed.sql
-- Dev seed data for agency_ops
-- Run with: supabase db reset (applies migrations + seed)
--
-- Users: admin@macroconsulting.cz (admin), analyst@macroconsulting.cz (member)
-- Password for both: Test1234!

-- ── Fixed UUIDs ────────────────────────────────────────────

-- Users
-- admin:   a0000000-0000-0000-0000-000000000001
-- analyst: a0000000-0000-0000-0000-000000000002

-- Clients
-- MacroConsulting: c0000000-0000-0000-0000-000000000001
-- Demo E-shop:    c0000000-0000-0000-0000-000000000002
-- Demo SaaS:      c0000000-0000-0000-0000-000000000003

-- Jobs
-- Demo audit:     d0000000-0000-0000-0000-000000000001

-- ── Auth users ─────────────────────────────────────────────
-- Password hash for "Test1234!" (bcrypt)

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, confirmation_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'admin@macroconsulting.cz',
  extensions.crypt('Test1234!', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"full_name": "Admin MacroConsulting"}'::jsonb,
  ''
), (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated',
  'analyst@macroconsulting.cz',
  extensions.crypt('Test1234!', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"full_name": "SEO Analytik"}'::jsonb,
  ''
);

-- Auth identities (required for Supabase Auth to work)
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "email": "admin@macroconsulting.cz"}'::jsonb,
  'email', now(), now(), now()
), (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  '{"sub": "a0000000-0000-0000-0000-000000000002", "email": "analyst@macroconsulting.cz"}'::jsonb,
  'email', now(), now(), now()
);

-- ── Profiles (trigger auto-created, now set admin role) ────

update public.profiles
  set role = 'admin', full_name = 'Admin MacroConsulting'
  where id = 'a0000000-0000-0000-0000-000000000001';

update public.profiles
  set full_name = 'SEO Analytik'
  where id = 'a0000000-0000-0000-0000-000000000002';

-- ── Clients ────────────────────────────────────────────────

insert into public.clients (id, name, domain, slug, brand_voice, notes, is_active, created_by) values
(
  'c0000000-0000-0000-0000-000000000001',
  'MacroConsulting',
  'macroconsulting.cz',
  'macroconsulting',
  'Profesionální, přátelský, expertní tón. Preferujeme jasné a stručné sdělení.',
  'Interní projekty agentury. Vlastní web, blog, social media.',
  true,
  'a0000000-0000-0000-0000-000000000001'
),
(
  'c0000000-0000-0000-0000-000000000002',
  'Demo E-shop',
  'example-shop.cz',
  'demo-eshop',
  'Přímý, prodejní, zaměřený na benefity. Cílová skupina: ženy 25-45.',
  'Ukázkový e-commerce klient. Shoptet platforma, české zboží.',
  true,
  'a0000000-0000-0000-0000-000000000001'
),
(
  'c0000000-0000-0000-0000-000000000003',
  'Demo SaaS',
  'example-saas.cz',
  'demo-saas',
  'Technický, důvěryhodný, B2B jazyk. Důraz na ROI a efektivitu.',
  'Ukázkový B2B SaaS klient. Next.js aplikace, cílí na české firmy.',
  true,
  'a0000000-0000-0000-0000-000000000001'
);

-- ── Client members ─────────────────────────────────────────
-- Admin: přístup ke všem 3 klientům
-- Analyst: přístup k MacroConsulting a Demo E-shop (NE Demo SaaS)

insert into public.client_members (client_id, user_id, role) values
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin'),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'admin'),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'admin'),
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'member'),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'member');

-- ── Demo completed job ─────────────────────────────────────

insert into public.jobs (
  id, client_id, job_type, status, params, progress, progress_message,
  result, retry_count, started_at, completed_at, created_at, created_by
) values (
  'd0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'seo.technical-audit',
  'completed',
  '{"domain": "macroconsulting.cz", "crawl_depth": 3, "max_pages": 100}'::jsonb,
  100,
  'Analýza dokončena',
  '{
    "summary": {
      "total_pages_crawled": 42,
      "total_issues": 25,
      "critical_count": 3,
      "warning_count": 12,
      "info_count": 10,
      "overall_score": 72,
      "crawl_duration_ms": 185000
    },
    "categories": {
      "performance": {
        "score": 68,
        "issues": [
          {
            "severity": "warning",
            "title": "LCP nad 2.5s na 8 stránkách",
            "description": "Largest Contentful Paint překračuje doporučenou hranici 2.5s na 8 z 42 crawlovaných stránek. Průměrné LCP je 3.1s.",
            "affected_urls": ["https://macroconsulting.cz/sluzby", "https://macroconsulting.cz/blog"],
            "recommendation": "Optimalizujte hlavní obrázky (lazy loading, WebP formát) a kritické CSS. Zvažte preload pro hero sekce."
          },
          {
            "severity": "info",
            "title": "TTFB nad 200ms na homepage",
            "description": "Time to First Byte na homepage je 340ms. Není kritické, ale zlepšení by pomohlo.",
            "affected_urls": ["https://macroconsulting.cz/"],
            "recommendation": "Zvažte CDN nebo server-side caching pro homepage."
          }
        ]
      },
      "indexability": {
        "score": 58,
        "issues": [
          {
            "severity": "critical",
            "title": "5 URL v sitemapě má noindex tag",
            "description": "V sitemap.xml je 5 URL, které mají meta robots noindex. Toto je konflikt — Google vidí URL v sitemapě, ale nemá ji indexovat.",
            "affected_urls": ["https://macroconsulting.cz/test-page", "https://macroconsulting.cz/draft-1", "https://macroconsulting.cz/draft-2", "https://macroconsulting.cz/staging", "https://macroconsulting.cz/preview"],
            "recommendation": "Odstraňte noindex stránky ze sitemap.xml, nebo odstraňte noindex tag pokud mají být indexovány."
          },
          {
            "severity": "critical",
            "title": "Chybějící self-referencing canonical na 12 stránkách",
            "description": "12 stránek nemá canonical tag odkazující samy na sebe. Google může zvolit nesprávnou canonical verzi.",
            "affected_urls": ["https://macroconsulting.cz/sluzby/seo", "https://macroconsulting.cz/sluzby/ppc"],
            "recommendation": "Přidejte self-referencing canonical tag na všechny indexovatelné stránky."
          },
          {
            "severity": "warning",
            "title": "3 URL v sitemapě vrací 301",
            "description": "Sitemap obsahuje URL, které redirectují. Google to zpracuje, ale je to zbytečná zátěž.",
            "affected_urls": ["https://macroconsulting.cz/old-page"],
            "recommendation": "Aktualizujte sitemap.xml — nahraďte redirectující URL finálními cílovými URL."
          }
        ]
      },
      "meta_tags": {
        "score": 75,
        "issues": [
          {
            "severity": "warning",
            "title": "Duplicitní title tagy na 4 stránkách",
            "description": "4 stránky sdílí stejný title tag. Každá stránka by měla mít unikátní title.",
            "affected_urls": ["https://macroconsulting.cz/sluzby/seo", "https://macroconsulting.cz/sluzby/ppc", "https://macroconsulting.cz/sluzby/social", "https://macroconsulting.cz/sluzby/analytics"],
            "recommendation": "Vytvořte unikátní, popisné title tagy pro každou stránku služby."
          },
          {
            "severity": "warning",
            "title": "Chybějící meta description na 6 stránkách",
            "description": "6 stránek nemá meta description. Google si vygeneruje vlastní snippet, který nemusí být optimální.",
            "affected_urls": ["https://macroconsulting.cz/blog/post-1", "https://macroconsulting.cz/blog/post-2"],
            "recommendation": "Doplňte meta description (150-160 znaků) s relevantními klíčovými slovy."
          }
        ]
      },
      "structured_data": {
        "score": 60,
        "issues": [
          {
            "severity": "warning",
            "title": "Chybějící Organization schema",
            "description": "Homepage nemá Organization structured data. Toto pomáhá Google pochopit váš brand.",
            "affected_urls": ["https://macroconsulting.cz/"],
            "recommendation": "Přidejte JSON-LD Organization schema na homepage s názvem, logem, kontaktem a social profiles."
          },
          {
            "severity": "info",
            "title": "Blog posty bez Article schema",
            "description": "Blogové příspěvky nemají Article/BlogPosting structured data.",
            "affected_urls": ["https://macroconsulting.cz/blog/post-1"],
            "recommendation": "Přidejte BlogPosting schema s autorem, datem publikace a hlavním obrázkem."
          }
        ]
      },
      "mobile_friendliness": {
        "score": 92,
        "issues": [
          {
            "severity": "info",
            "title": "Tap targets příliš blízko na 2 stránkách",
            "description": "Některé klikatelné elementy jsou menší než 48x48px nebo příliš blízko u sebe.",
            "affected_urls": ["https://macroconsulting.cz/kontakt"],
            "recommendation": "Zvětšete padding na tlačítkách a odkazech v patičce."
          }
        ]
      },
      "core_web_vitals": {
        "score": 70,
        "issues": [
          {
            "severity": "warning",
            "title": "CLS nad 0.1 na 5 stránkách",
            "description": "Cumulative Layout Shift překračuje doporučenou hranici na stránkách s obrázky bez definovaných rozměrů.",
            "affected_urls": ["https://macroconsulting.cz/blog", "https://macroconsulting.cz/reference"],
            "recommendation": "Definujte width a height atributy na všech img elementech. Použijte aspect-ratio CSS."
          }
        ]
      },
      "internal_linking": {
        "score": 78,
        "issues": [
          {
            "severity": "warning",
            "title": "3 stránky s click depth > 4",
            "description": "Některé stránky vyžadují více než 4 kliknutí z homepage. Google je může považovat za méně důležité.",
            "affected_urls": ["https://macroconsulting.cz/blog/archiv/2023/post-old"],
            "recommendation": "Přidejte interní odkazy z hlavní navigace nebo sidebar widgetu."
          },
          {
            "severity": "info",
            "title": "8 stránek s méně než 3 interními odkazy",
            "description": "Tyto stránky mají slabou interní linkovou strukturu.",
            "affected_urls": ["https://macroconsulting.cz/gdpr", "https://macroconsulting.cz/cookies"],
            "recommendation": "Zvažte kontextové prolinkování z related obsahu."
          }
        ]
      },
      "broken_links": {
        "score": 85,
        "issues": [
          {
            "severity": "critical",
            "title": "2 broken interní linky (404)",
            "description": "Nalezeny 2 interní odkazy vedoucí na neexistující stránky.",
            "affected_urls": ["https://macroconsulting.cz/old-service", "https://macroconsulting.cz/team-member"],
            "recommendation": "Opravte nebo odstraňte nefunkční odkazy. Nastavte 301 redirect pokud obsah přesídlil."
          }
        ]
      },
      "redirects": {
        "score": 88,
        "issues": [
          {
            "severity": "warning",
            "title": "Redirect chain delší než 2 hopy",
            "description": "1 redirect řetězec má 3 hopy: HTTP → HTTPS → www → finální URL.",
            "affected_urls": ["http://macroconsulting.cz/sluzby"],
            "recommendation": "Zkraťte redirect chain — směřujte přímo na finální HTTPS URL."
          }
        ]
      },
      "sitemap_robots": {
        "score": 70,
        "issues": [
          {
            "severity": "warning",
            "title": "Sitemap obsahuje 5 non-200 URL",
            "description": "V sitemap.xml je 5 URL, které nevrací status 200 (3 redirecty, 2 noindex).",
            "affected_urls": ["https://macroconsulting.cz/sitemap.xml"],
            "recommendation": "Vyčistěte sitemap — ponechte pouze kanonické, indexovatelné URL se statusem 200."
          }
        ]
      },
      "security": {
        "score": 95,
        "issues": [
          {
            "severity": "info",
            "title": "Chybějící HSTS header",
            "description": "Web neposílá Strict-Transport-Security header. Prohlížeč může při prvním přístupu zkusit HTTP.",
            "affected_urls": ["https://macroconsulting.cz/"],
            "recommendation": "Přidejte HSTS header: Strict-Transport-Security: max-age=31536000; includeSubDomains"
          }
        ]
      }
    },
    "pages": [
      {
        "url": "https://macroconsulting.cz/",
        "status_code": 200,
        "title": "MacroConsulting | Digitální marketingová agentura",
        "meta_description": "Full-service digitální marketingová agentura. SEO, PPC, sociální sítě, analytika.",
        "h1": ["Digitální marketing, který funguje"],
        "load_time_ms": 1250,
        "content_length": 45200,
        "issues": []
      },
      {
        "url": "https://macroconsulting.cz/sluzby",
        "status_code": 200,
        "title": "Služby | MacroConsulting",
        "meta_description": "",
        "h1": ["Naše služby"],
        "load_time_ms": 2800,
        "content_length": 32100,
        "issues": [
          {
            "severity": "warning",
            "title": "Chybějící meta description",
            "description": "Stránka nemá meta description.",
            "affected_urls": ["https://macroconsulting.cz/sluzby"],
            "recommendation": "Doplňte meta description."
          }
        ]
      },
      {
        "url": "https://macroconsulting.cz/blog",
        "status_code": 200,
        "title": "Blog | MacroConsulting",
        "meta_description": "Články o digitálním marketingu, SEO a PPC.",
        "h1": ["Blog"],
        "load_time_ms": 3200,
        "content_length": 28500,
        "issues": []
      }
    ],
    "ai_recommendations": "## Executive Summary\n\nWeb macroconsulting.cz vykazuje solidní technický základ s celkovým skóre 72/100. Hlavní problémy se týkají indexace (konflikt noindex tagů se sitemapou) a chybějících canonical tagů. Performance je průměrná — LCP a CLS potřebují optimalizaci.\n\n## Prioritizovaný akční plán\n\n### Sprint 1: Quick Wins\n1. **Opravit sitemap.xml** — odstranit noindex a redirectující URL (Impact: 5, Effort: 1)\n2. **Přidat self-referencing canonical** na všech 12 stránek (Impact: 4, Effort: 1)\n3. **Opravit 2 broken linky** (Impact: 3, Effort: 1)\n4. **Přidat HSTS header** (Impact: 2, Effort: 1)\n\n### Sprint 2: Major Projects\n5. **Optimalizace LCP** — obrázky, kritické CSS, preload (Impact: 4, Effort: 3)\n6. **Přidat structured data** — Organization, BlogPosting (Impact: 3, Effort: 2)\n7. **Doplnit meta descriptions** na 6 stránek (Impact: 3, Effort: 2)\n8. **Opravit CLS** — definovat rozměry obrázků (Impact: 3, Effort: 2)\n\n### Backlog\n9. Deduplikovat title tagy služeb\n10. Zlepšit interní linking archivních příspěvků\n11. Přidat Article schema na blog\n12. Zvětšit tap targets na kontaktní stránce"
  }'::jsonb,
  0,
  now() - interval '12 minutes',
  now() - interval '1 minute',
  now() - interval '15 minutes',
  'a0000000-0000-0000-0000-000000000001'
);

-- ── Audit log entries ──────────────────────────────────────

insert into public.audit_log (user_id, client_id, action, metadata) values
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'job.created', '{"job_id": "d0000000-0000-0000-0000-000000000001", "job_type": "seo.technical-audit"}'::jsonb),
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'job.completed', '{"job_id": "d0000000-0000-0000-0000-000000000001", "score": 72}'::jsonb);
