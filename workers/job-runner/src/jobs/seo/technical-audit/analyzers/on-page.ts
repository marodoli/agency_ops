import type { Issue } from "@agency-ops/shared";
import type { AnalyzerInput } from "./base";

/**
 * On-page analyzer — checks titles, meta descriptions, H1 structure,
 * content quality, images, and max-image-preview.
 */
export function analyzeOnPage(input: AnalyzerInput): Issue[] {
  const { pages } = input;
  const issues: Issue[] = [];

  // Only analyze 200 OK HTML pages
  const validPages = pages.filter((p) => p.statusCode === 200);

  // ── Missing title → CRITICAL ──────────────────────────────
  const missingTitle = validPages.filter((p) => !p.title);
  if (missingTitle.length > 0) {
    issues.push({
      severity: "critical",
      title: "Chybějící title tag",
      description: `${missingTitle.length} stránek nemá title tag. Title je klíčový ranking faktor a ovlivňuje CTR ve výsledcích vyhledávání.`,
      affected_urls: missingTitle.map((p) => p.finalUrl),
      recommendation:
        "Přidejte unikátní, popisný title tag (50–60 znaků) na každou stránku.",
    });
  }

  // ── Duplicate titles → WARNING ─────────────────────────────
  const titleMap = new Map<string, string[]>();
  for (const page of validPages) {
    if (!page.title) continue;
    const key = page.title.toLowerCase().trim();
    const existing = titleMap.get(key);
    if (existing) {
      existing.push(page.finalUrl);
    } else {
      titleMap.set(key, [page.finalUrl]);
    }
  }
  const duplicateTitles = Array.from(titleMap.entries()).filter(
    ([, urls]) => urls.length > 1,
  );
  if (duplicateTitles.length > 0) {
    const affected = duplicateTitles.flatMap(([, urls]) => urls);
    issues.push({
      severity: "warning",
      title: "Duplicitní title tagy",
      description: `${duplicateTitles.length} skupin stránek sdílí stejný title. Duplicitní titulky ztěžují vyhledávačům rozlišení stránek.`,
      affected_urls: affected,
      recommendation:
        "Vytvořte pro každou stránku unikátní title, který přesně popisuje její obsah.",
    });
  }

  // ── Title > 60 chars → INFO ───────────────────────────────
  const longTitles = validPages.filter(
    (p) => p.title && p.title.length > 60,
  );
  if (longTitles.length > 0) {
    issues.push({
      severity: "info",
      title: "Title delší než 60 znaků",
      description: `${longTitles.length} stránek má title delší než 60 znaků. Dlouhé titulky mohou být ve výsledcích vyhledávání oříznuty.`,
      affected_urls: longTitles.map((p) => p.finalUrl),
      recommendation:
        "Zkraťte titulky na 50–60 znaků. Nejdůležitější klíčová slova dejte na začátek.",
    });
  }

  // ── Title < 30 chars → WARNING ─────────────────────────────
  const shortTitles = validPages.filter(
    (p) => p.title && p.title.length > 0 && p.title.length < 30,
  );
  if (shortTitles.length > 0) {
    issues.push({
      severity: "warning",
      title: "Title kratší než 30 znaků",
      description: `${shortTitles.length} stránek má příliš krátký title. Krátké titulky nevyužívají potenciál pro klíčová slova.`,
      affected_urls: shortTitles.map((p) => p.finalUrl),
      recommendation:
        "Rozšiřte titulky na 50–60 znaků s popisným textem a relevantními klíčovými slovy.",
    });
  }

  // ── Missing meta description → WARNING ─────────────────────
  const missingMeta = validPages.filter((p) => !p.metaDescription);
  if (missingMeta.length > 0) {
    issues.push({
      severity: "warning",
      title: "Chybějící meta description",
      description: `${missingMeta.length} stránek nemá meta description. Vyhledávače si vygenerují vlastní snippet, který nemusí být optimální.`,
      affected_urls: missingMeta.map((p) => p.finalUrl),
      recommendation:
        "Přidejte unikátní meta description (120–160 znaků) s CTA a klíčovými slovy.",
    });
  }

  // ── Duplicate meta descriptions → WARNING ──────────────────
  const metaMap = new Map<string, string[]>();
  for (const page of validPages) {
    if (!page.metaDescription) continue;
    const key = page.metaDescription.toLowerCase().trim();
    const existing = metaMap.get(key);
    if (existing) {
      existing.push(page.finalUrl);
    } else {
      metaMap.set(key, [page.finalUrl]);
    }
  }
  const duplicateMetas = Array.from(metaMap.entries()).filter(
    ([, urls]) => urls.length > 1,
  );
  if (duplicateMetas.length > 0) {
    const affected = duplicateMetas.flatMap(([, urls]) => urls);
    issues.push({
      severity: "warning",
      title: "Duplicitní meta description",
      description: `${duplicateMetas.length} skupin stránek sdílí stejný meta description.`,
      affected_urls: affected,
      recommendation:
        "Vytvořte pro každou stránku unikátní meta description popisující její specifický obsah.",
    });
  }

  // ── Missing H1 → CRITICAL ─────────────────────────────────
  const missingH1 = validPages.filter((p) => p.h1.length === 0);
  if (missingH1.length > 0) {
    issues.push({
      severity: "critical",
      title: "Chybějící H1 nadpis",
      description: `${missingH1.length} stránek nemá H1 nadpis. H1 je důležitý signál pro vyhledávače o tématu stránky.`,
      affected_urls: missingH1.map((p) => p.finalUrl),
      recommendation:
        "Přidejte na každou stránku jeden H1 nadpis, který popisuje hlavní téma.",
    });
  }

  // ── Multiple H1 → WARNING ─────────────────────────────────
  const multipleH1 = validPages.filter((p) => p.h1.length > 1);
  if (multipleH1.length > 0) {
    issues.push({
      severity: "warning",
      title: "Více H1 nadpisů na stránce",
      description: `${multipleH1.length} stránek má více než jeden H1 nadpis. Jeden H1 je best practice pro jasnou hierarchii obsahu.`,
      affected_urls: multipleH1.map((p) => p.finalUrl),
      recommendation:
        "Ponechte jeden H1 na stránku. Další nadpisy přesuňte na H2–H3.",
    });
  }

  // ── H1 duplicates title → INFO ─────────────────────────────
  const h1DuplicatesTitle = validPages.filter((p) => {
    if (!p.title || p.h1.length === 0) return false;
    const titleNorm = p.title.toLowerCase().trim();
    return p.h1.some((h) => h.toLowerCase().trim() === titleNorm);
  });
  if (h1DuplicatesTitle.length > 0) {
    issues.push({
      severity: "info",
      title: "H1 je identický s title tagem",
      description: `${h1DuplicatesTitle.length} stránek má H1 nadpis totožný s title tagem. Rozdílné znění lépe využívá prostor pro klíčová slova.`,
      affected_urls: h1DuplicatesTitle.map((p) => p.finalUrl),
      recommendation:
        "Odlište H1 od title — H1 může být delší a popisnější, title by měl být stručný a klikatelný.",
    });
  }

  // ── Thin content (< 300 words) → WARNING ──────────────────
  const thinContent = validPages.filter((p) => {
    // Skip non-content pages (likely app pages, login, etc.)
    if (p.wordCount < 300 && p.wordCount > 0) return true;
    return false;
  });
  if (thinContent.length > 0) {
    issues.push({
      severity: "warning",
      title: "Tenký obsah (< 300 slov)",
      description: `${thinContent.length} stránek má méně než 300 slov. Stránky s málo obsahem mají nižší šanci na ranking.`,
      affected_urls: thinContent.map((p) => p.finalUrl),
      recommendation:
        "Rozšiřte obsah o relevantní informace, odpovědi na otázky uživatelů a podrobnosti k tématu.",
    });
  }

  // ── Images missing alt text → WARNING ──────────────────────
  const pagesWithMissingAlt: string[] = [];
  let totalMissingAlt = 0;
  for (const page of validPages) {
    const missing = page.images.filter(
      (img) => img.alt === null || img.alt.trim() === "",
    );
    if (missing.length > 0) {
      pagesWithMissingAlt.push(page.finalUrl);
      totalMissingAlt += missing.length;
    }
  }
  if (pagesWithMissingAlt.length > 0) {
    issues.push({
      severity: "warning",
      title: "Obrázky bez alt textu",
      description: `${totalMissingAlt} obrázků na ${pagesWithMissingAlt.length} stránkách nemá alt text. Alt text je důležitý pro přístupnost a image SEO.`,
      affected_urls: pagesWithMissingAlt,
      recommendation:
        "Přidejte popisný alt text ke všem obrázkům. Dekorativní obrázky mohou mít prázdný alt (alt='').",
    });
  }

  // ── Images > 150KB → INFO ─────────────────────────────────
  const pagesWithLargeImages: string[] = [];
  for (const page of validPages) {
    const large = page.images.filter(
      (img) => img.sizeKb !== null && img.sizeKb > 150,
    );
    if (large.length > 0) {
      pagesWithLargeImages.push(page.finalUrl);
    }
  }
  if (pagesWithLargeImages.length > 0) {
    issues.push({
      severity: "info",
      title: "Velké obrázky (> 150 KB)",
      description: `${pagesWithLargeImages.length} stránek obsahuje obrázky větší než 150 KB. Velké obrázky zpomalují načítání.`,
      affected_urls: pagesWithLargeImages,
      recommendation:
        "Komprimujte obrázky a použijte moderní formáty (WebP, AVIF). Implementujte lazy loading.",
    });
  }

  // ── Missing max-image-preview:large → INFO ─────────────────
  const missingMaxImagePreview = validPages.filter(
    (p) => !p.maxImagePreview,
  );
  if (missingMaxImagePreview.length > 0) {
    issues.push({
      severity: "info",
      title: "Chybějící max-image-preview:large",
      description: `${missingMaxImagePreview.length} stránek nemá direktivu max-image-preview:large. Bez ní Google nemusí zobrazit velké náhledy obrázků ve výsledcích.`,
      affected_urls: missingMaxImagePreview.map((p) => p.finalUrl),
      recommendation:
        "Přidejte <meta name='robots' content='max-image-preview:large'> pro povolení velkých náhledů ve vyhledávání.",
    });
  }

  return issues;
}
