# design.md – Design System & UI Guidelines

## Design Fidelity Level
- [x] **Ú2: Custom tokens** (shadcn/ui base + MacroConsulting brand barvy + Poppins)
- [ ] Ú3: Figma-driven (nepoužíváme)

---

## Barevná paleta

### Primární – Oranžová (#F18B32)
Použití: CTA tlačítka, aktivní stavy, akcenty, progress bary, score highlights.

| Token | Hex | Použití |
|-------|-----|---------|
| primary-50 | #fdf5ee | Subtle backgrounds (selected row, hover card) |
| primary-100 | #fce7d6 | Light backgrounds (notification badges bg) |
| primary-200 | #f9d0ad | Borders na aktivních prvcích |
| primary-300 | #f6b984 | — |
| primary-400 | #f3a25b | Hover stav CTA |
| primary-500 | #F18B32 | **BASE – CTA, aktivní nav item, primary button** |
| primary-600 | #cc762a | Active/pressed stav |
| primary-700 | #a86123 | Text na světlém pozadí (pokud potřeba tmavší) |
| primary-800 | #844c1b | — |
| primary-900 | #603714 | — |

### Sekundární – Tmavá modrá (#005A87)
Použití: Sidebar, headery, sekundární tlačítka, text akcenty, linky.

| Token | Hex | Použití |
|-------|-----|---------|
| secondary-50 | #eaf1f5 | Subtle blue backgrounds |
| secondary-100 | #ccdee7 | Light blue surfaces |
| secondary-200 | #99bdcf | Disabled stavy, subtle borders |
| secondary-300 | #669cb7 | — |
| secondary-400 | #337b9f | Hover linky |
| secondary-500 | #005A87 | **BASE – Sidebar bg, headery, sekundární buttony** |
| secondary-600 | #004c72 | Sidebar hover items |
| secondary-700 | #003e5e | Sidebar active section |
| secondary-800 | #00314a | Velmi tmavé pozadí (footer, tooltip bg) |
| secondary-900 | #002436 | — |

### Neutrální (Grays)
| Token | Hex | Použití |
|-------|-----|---------|
| background | #FFFFFF | Hlavní pozadí (content area) |
| surface | #F8F9FA | Karty, povrchy |
| surface-hover | #F0F1F3 | Hover na kartách |
| border | #E2E4E8 | Defaultní bordery |
| border-subtle | #ECEEF1 | Jemné oddělovače |
| text-primary | #111827 | Hlavní text |
| text-secondary | #4B5563 | Sekundární text (popisy, labels) |
| text-muted | #9CA3AF | Metadata, timestamps, placeholders |

### Sémantické barvy
| Token | Hex | Použití |
|-------|-----|---------|
| success | #10B981 | Úspěšné akce, score 90-100 |
| warning | #F59E0B | Varování, score 40-69 |
| error | #EF4444 | Chyby, critical issues, score 0-39 |
| info | #3B82F6 | Informační, score 70-89 |

### Score gradient (SEO report)
| Rozsah | Barva | Label |
|--------|-------|-------|
| 0–39 | error (#EF4444) | Špatný |
| 40–69 | warning (#F59E0B) | Ke zlepšení |
| 70–89 | info (#3B82F6) | Dobrý |
| 90–100 | success (#10B981) | Výborný |

---

## Typografie

### Font: Poppins (Google Fonts)
- Import: `https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap`
- Fallback: `system-ui, -apple-system, sans-serif`

### Font mono: JetBrains Mono
- Použití: URL adresy, kód, technické hodnoty (status codes, response times)
- Import: `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap`

### Typografická škála
| Element | Tailwind class | Weight | Použití |
|---------|---------------|--------|---------|
| h1 | text-2xl (1.5rem) | font-semibold (600) | Titulky stránek |
| h2 | text-xl (1.25rem) | font-semibold (600) | Sekce (report kategorie) |
| h3 | text-lg (1.125rem) | font-medium (500) | Podsekce, card titulky |
| body | text-sm (0.875rem) | font-normal (400) | Defaultní text |
| caption | text-xs (0.75rem) | font-normal (400) | Labels, metadata, timestamps |
| button | text-sm (0.875rem) | font-medium (500) | Tlačítka a nav items |

### Pravidla
- Nadpisy (h1-h3): Poppins semibold/medium – výraznější, zakulacenější
- Body text: Poppins regular – čitelný i v menší velikosti
- Mono (URLs, kód): JetBrains Mono regular
- NIKDY nepoužívej font-bold (700) v body textu – jen v h1 pokud potřeba
- NIKDY nemixuj fonty – Poppins všude kromě kódu

---

## Layout

### Sidebar
- Šířka: w-64 (256px), fixed position
- Pozadí: **secondary-500** (#005A87) → `bg-sidebar`
- Text: bílý (white), opacity 70% pro neaktivní, 100% pro aktivní → `text-sidebar-foreground/70`
- Aktivní nav item: **primary-500** (#F18B32) levý border (4px) + bílý text + secondary-700 pozadí → `border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground`
- Hover: secondary-600 pozadí → `hover:bg-secondary-600`
- Disabled items: `opacity-50 pointer-events-none` + Badge outline "Brzy"
- Logo area: top, padding p-6, `text-lg font-semibold`
- Client selector: pod logem, placeholder Button ghost s ChevronDown
- Navigace: grouped by module (Dashboard, SEO → submenu s `pl-10` odsazením)
- Settings: zvlášť dole nad user sekcí
- User profile: úplně dole, Avatar + jméno + email + logout icon button
- Logout: `supabase.auth.signOut()` → redirect `/login` + `router.refresh()`

**Implementace:** `components/layout/sidebar.tsx` ("use client", usePathname pro active state)
**Nav config:** `components/layout/sidebar-nav.ts` (NavItem type, navItems array, settingsNav)

### Header
- Výška: h-16 (64px), sticky top, `z-30`
- Pozadí: white, bottom border → `border-b border-border bg-background`
- Obsah: breadcrumb vlevo (odvozený z pathname segmentů, české labely)
- Mobile: hamburger menu toggle vlevo (`lg:hidden`)

**Implementace:** `components/layout/header.tsx` ("use client", usePathname pro breadcrumb)

### Dashboard Shell
- Wrapper: `DashboardShell` ("use client") — řídí Sheet open/close stav
- Desktop: `<aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64">`
- Mobile: `<Sheet side="left">` s Sidebar, `onNavClick` zavírá Sheet
- Main: `<div className="lg:pl-64">` → Header + main content
- Obaleno `<TooltipProvider>`

**Implementace:** `components/layout/dashboard-shell.tsx`

### Content area
- Max width: max-w-7xl (1280px)
- Centering: mx-auto
- Padding: px-6 py-8
- Pozadí: background (#FFFFFF)

### Dashboard layout (server component)
- `app/(dashboard)/layout.tsx` — fetchne user data přes server Supabase client
- Query `profiles` tabulku pro `full_name`, `avatar_url`
- Fallback: email jako jméno pokud profil neexistuje
- Redirect na `/login` pokud user není přihlášený

### Responzivita
- Mobile (< 768px): sidebar skrytý, hamburger menu (Sheet overlay zleva)
- Tablet (768-1024px): sidebar skrytý, hamburger
- Desktop (> 1024px, `lg:`): sidebar vždy viditelný

---

## Auth stránky (Login / Signup)

### Layout
- Sdílený `(auth)/layout.tsx` — server component, žádná sidebar/header
- Centrovaný: `flex min-h-svh items-center justify-center bg-background px-4 py-12`
- Wrapper: `max-w-sm` (384px)

### Formulářový pattern
- Logo: "MacroConsulting" text v `text-secondary` + CardTitle (h1, text-2xl)
- Pole: Label + relativní wrapper s ikonou (absolutně pozicovaná, `left-3`) + Input (`pl-9`)
- Ikony: Mail, Lock, User z Lucide (size-4, text-muted-foreground)
- Validační chyby: `text-xs text-destructive` inline pod polem
- Server error banner: `bg-destructive/10 text-destructive`, rounded-md, nad formulářem
- Success banner: `bg-success/10 text-success` (pro redirect s `?message=check-email`)
- Confirm error banner: `bg-destructive/10 text-destructive` (pro `?message=confirm-error`)
- Submit button: `w-full`, default variant, disabled + Loader2 spinner při loading
- Footer: CardFooter s linkem na druhou auth stránku (`text-secondary hover:text-secondary/80`)

---

## Komponentová pravidla

### Obecné
- UI knihovna: **shadcn/ui** – VÝHRADNĚ komponenty z této knihovny
- NIKDY nevytvářej custom varianty bez explicitního schválení
- Všechny interaktivní komponenty: stavy default / hover / active / disabled / loading
- Formuláře: VŽDY inline validační chyby (ne jen toast)
- Tabulky: VŽDY sortovatelné headery kde dává smysl
- Seznamy: VŽDY empty state s CTA

### Tlačítka
- Primary: bg-primary-500, text white, hover bg-primary-400
- Secondary: bg-secondary-500, text white, hover bg-secondary-600
- Outline: border-border, text-text-primary, hover bg-surface
- Destructive: bg-error, text white
- Ghost: transparent, hover bg-surface
- Zakulacení: rounded-lg (ne rounded-full)

### Karty
- Pozadí: surface (#F8F9FA)
- Border: border (#E2E4E8)
- Shadow: shadow-sm (subtle)
- Padding: p-6
- Hover (pokud klikatelná): shadow-md + border-primary-200
- Zakulacení: rounded-lg

**Client card pattern** (`components/clients/client-card.tsx`):
- CardHeader: jméno klienta (text-lg font-semibold) + Badge active/inactive vpravo
- Doména: Globe ikona (size-3.5) + text-sm text-muted-foreground
- CardContent: počet dokončených jobů
- CardFooter: Button outline "Otevřít" → `/clients/{slug}`

**Empty state pattern:**
- Centrovaný: `mt-12 flex flex-col items-center gap-4 text-center`
- Ikona: size-16 rounded-lg bg-surface, vnitřní ikona size-8 text-muted-foreground
- Text: h2 text-lg font-medium + p text-sm text-muted-foreground
- CTA: Button pokud má uživatel oprávnění (admin check)

**Client detail page pattern** (`clients/[id]/page.tsx` + `client-detail-tabs.tsx`):
- Zpět link: Button ghost size-sm s ArrowLeft ikonou, `-ml-2`
- Header: h1 text-2xl font-semibold + doména jako `<a>` link (target _blank) + Badge active/inactive
- Tabs (line variant): Přehled | SEO Jobs | Nastavení (admin only)
- Tab Přehled: 2-col grid (lg), vlevo brand voice + poznámky + metadata datumy, vpravo tým (Avatar + jméno + role Badge)
- Tab SEO Jobs: Table s typem, statusem (Badge), progress, datumy. Empty state text pokud žádné joby.
- Tab Nastavení: edit form (max-w-lg), success/error banners, Separator + "Nebezpečná zóna" s deaktivací

**New client form** (`clients/new/`):
- Admin only (server-side redirect na `/`)
- max-w-lg, h1 + popis + form (name*, domain, brandVoice textarea, notes textarea)
- Buttons: "Vytvořit klienta" + "Zrušit" (outline, link na `/`)

### Badges / Score badges
- Severity critical: bg-error/10, text-error, border-error/20
- Severity warning: bg-warning/10, text-warning, border-warning/20
- Severity info: bg-info/10, text-info, border-info/20
- Status active: bg-success/10, text-success
- Status inactive: bg-surface, text-text-muted

### Job-specific komponenty
- **Progress bar:** bg-surface track, bg-primary-500 fill, animated (transition-all), percentage text + status message
- **Score badge:** velký kruh nebo číslo, barva dle score gradient
- **Issue card:** severity icon vlevo (barva dle severity) + title + description, affected URLs collapsible
- **Report section:** collapsible accordion, header = kategorie název + score badge + issue count

---

## Ikony
- Sada: **Lucide React** – VÝHRADNĚ z tohoto setu
- Velikosti: w-4 h-4 (inline), w-5 h-5 (navigace), w-6 h-6 (feature ikony)
- Barva: currentColor (dědí z textu)
- Pokud ikona neexistuje v Lucide → ZEPTEJ SE, nevymýšlej alternativu

---

## Dark mode
- **NE** v MVP – jen light mode
- Sidebar je tmavý by design (secondary-500), content area je světlý
- Budoucnost: zvážit full dark mode po MVP

---

## Zakázáno (Hard rules)
- ❌ Hardcoded hex barvy v komponentách → VŽDY Tailwind tokeny
- ❌ Magic px/rem hodnoty → VŽDY Tailwind utility classes
- ❌ Inline styles
- ❌ !important
- ❌ z-index > 50 bez komentáře proč
- ❌ rounded-full na velkých prvcích (max rounded-lg)
- ❌ Gradient backgrounds (výjimka: hero sekce pokud schváleno)
- ❌ Generická fialová/modrá AI estetika → TOTO JE AGENTURNÍ NÁSTROJ
- ❌ Font-bold (700) v body textu
- ❌ Mixování fontů (Poppins + jiný sans-serif)
