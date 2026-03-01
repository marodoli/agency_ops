import type { Issue } from "@agency-ops/shared";
import type { AnalyzerInput } from "./base";

/**
 * Structured data analyzer — checks JSON-LD schemas:
 * Organization, BreadcrumbList, Article, FAQPage, Product.
 */
export function analyzeStructuredData(input: AnalyzerInput): Issue[] {
  const { pages } = input;
  const issues: Issue[] = [];

  const validPages = pages.filter((p) => p.statusCode === 200);
  if (validPages.length === 0) return issues;

  // Collect all JSON-LD types across the site
  const pageSchemaTypes = new Map<string, Set<string>>();
  for (const page of validPages) {
    const types = new Set<string>();
    for (const ld of page.jsonLd) {
      const schemaType = extractType(ld);
      if (schemaType) {
        for (const t of schemaType) {
          types.add(t);
        }
      }
    }
    pageSchemaTypes.set(page.finalUrl, types);
  }

  const allTypesFlat = new Set<string>();
  for (const types of pageSchemaTypes.values()) {
    for (const t of types) {
      allTypesFlat.add(t);
    }
  }

  // ── Missing Organization schema → WARNING ────────────────────
  if (!allTypesFlat.has("Organization") && !allTypesFlat.has("LocalBusiness")) {
    // Check homepage specifically
    const homepage = validPages.find((p) => p.crawlDepth === 0);
    issues.push({
      severity: "warning",
      title: "Chybějící Organization schema",
      description:
        "Web nemá Organization (ani LocalBusiness) schema markup. Organization schema pomáhá vyhledávačům identifikovat firmu a zobrazit Knowledge Panel.",
      affected_urls: homepage ? [homepage.finalUrl] : [],
      recommendation:
        "Přidejte JSON-LD Organization schema na homepage s názvem firmy, logem, kontakty a sociálními profily.",
    });
  }

  // ── Missing BreadcrumbList on multi-level sites → WARNING ────
  const hasDeepPages = validPages.some((p) => p.crawlDepth >= 2);
  if (hasDeepPages && !allTypesFlat.has("BreadcrumbList")) {
    const deepPagesWithout = validPages.filter(
      (p) =>
        p.crawlDepth >= 2 &&
        !pageSchemaTypes.get(p.finalUrl)?.has("BreadcrumbList"),
    );
    if (deepPagesWithout.length > 0) {
      issues.push({
        severity: "warning",
        title: "Chybějící BreadcrumbList schema",
        description: `${deepPagesWithout.length} stránek na úrovni 2+ nemá BreadcrumbList schema. Breadcrumbs ve výsledcích vyhledávání zlepšují CTR.`,
        affected_urls: deepPagesWithout
          .slice(0, 20)
          .map((p) => p.finalUrl),
        recommendation:
          "Přidejte JSON-LD BreadcrumbList schema na všechny stránky s víceúrovňovou navigací.",
      });
    }
  }

  // ── Missing Article/BlogPosting on blog posts → INFO ─────────
  const blogPatterns = ["/blog", "/clanek", "/clanky", "/article", "/posts", "/aktuality", "/novinky"];
  const blogPages = validPages.filter((p) => {
    try {
      const path = new URL(p.finalUrl).pathname.toLowerCase();
      return blogPatterns.some((bp) => path.includes(bp));
    } catch {
      return false;
    }
  });
  const blogPagesWithout = blogPages.filter((p) => {
    const types = pageSchemaTypes.get(p.finalUrl);
    return (
      !types?.has("Article") &&
      !types?.has("BlogPosting") &&
      !types?.has("NewsArticle")
    );
  });
  if (blogPagesWithout.length > 0) {
    issues.push({
      severity: "info",
      title: "Blogové stránky bez Article/BlogPosting schema",
      description: `${blogPagesWithout.length} stránek v blogu/článcích nemá Article nebo BlogPosting schema. Tato schema umožňují rich snippets a lepší zobrazení ve vyhledávání.`,
      affected_urls: blogPagesWithout.map((p) => p.finalUrl),
      recommendation:
        "Přidejte JSON-LD Article nebo BlogPosting schema na všechny blogové stránky s headline, author, datePublished a image.",
    });
  }

  // ── FAQ pages without FAQPage schema → INFO ──────────────────
  const faqPatterns = ["/faq", "/casto-kladene", "/otazky", "/frequently"];
  const faqPages = validPages.filter((p) => {
    try {
      const path = new URL(p.finalUrl).pathname.toLowerCase();
      return faqPatterns.some((fp) => path.includes(fp));
    } catch {
      return false;
    }
  });
  const faqPagesWithout = faqPages.filter((p) => {
    const types = pageSchemaTypes.get(p.finalUrl);
    return !types?.has("FAQPage");
  });
  if (faqPagesWithout.length > 0) {
    issues.push({
      severity: "info",
      title: "FAQ stránky bez FAQPage schema",
      description: `${faqPagesWithout.length} FAQ stránek nemá FAQPage schema. FAQPage schema umožňuje zobrazení otázek a odpovědí přímo ve výsledcích vyhledávání.`,
      affected_urls: faqPagesWithout.map((p) => p.finalUrl),
      recommendation:
        "Přidejte JSON-LD FAQPage schema s mainEntity obsahujícím Question a acceptedAnswer.",
    });
  }

  // ── E-commerce without Product schema → WARNING ──────────────
  const productPatterns = ["/produkt", "/product", "/zbozi", "/eshop", "/shop"];
  const productPages = validPages.filter((p) => {
    try {
      const path = new URL(p.finalUrl).pathname.toLowerCase();
      return productPatterns.some((pp) => path.includes(pp));
    } catch {
      return false;
    }
  });
  const productPagesWithout = productPages.filter((p) => {
    const types = pageSchemaTypes.get(p.finalUrl);
    return !types?.has("Product");
  });
  if (productPagesWithout.length > 0) {
    issues.push({
      severity: "warning",
      title: "Produktové stránky bez Product schema",
      description: `${productPagesWithout.length} produktových stránek nemá Product schema. Product schema umožňuje zobrazení ceny, hodnocení a dostupnosti ve výsledcích.`,
      affected_urls: productPagesWithout.map((p) => p.finalUrl),
      recommendation:
        "Přidejte JSON-LD Product schema s name, description, offers (price, availability) a případně aggregateRating.",
    });
  }

  // ── JSON-LD validation errors → WARNING ──────────────────────
  const pagesWithInvalidLd: string[] = [];
  for (const page of validPages) {
    for (const ld of page.jsonLd) {
      if (!isValidJsonLd(ld)) {
        pagesWithInvalidLd.push(page.finalUrl);
        break;
      }
    }
  }
  if (pagesWithInvalidLd.length > 0) {
    issues.push({
      severity: "warning",
      title: "JSON-LD s chybami",
      description: `${pagesWithInvalidLd.length} stránek má JSON-LD structured data bez povinného @type nebo @context. Vyhledávače nemusí tato data zpracovat.`,
      affected_urls: pagesWithInvalidLd,
      recommendation:
        "Opravte JSON-LD — každý objekt musí mít @context (schema.org) a @type. Validujte pomocí Google Rich Results Test.",
    });
  }

  return issues;
}

// ── Helpers ──────────────────────────────────────────────────

function extractType(ld: Record<string, unknown>): string[] {
  const types: string[] = [];

  const rawType = ld["@type"];
  if (typeof rawType === "string") {
    types.push(normalizeSchemaType(rawType));
  } else if (Array.isArray(rawType)) {
    for (const t of rawType) {
      if (typeof t === "string") {
        types.push(normalizeSchemaType(t));
      }
    }
  }

  // Check @graph
  const graph = ld["@graph"];
  if (Array.isArray(graph)) {
    for (const item of graph) {
      if (typeof item === "object" && item !== null) {
        const nested = extractType(item as Record<string, unknown>);
        types.push(...nested);
      }
    }
  }

  return types;
}

function normalizeSchemaType(type: string): string {
  // Strip schema.org prefix if present
  return type.replace(/^https?:\/\/schema\.org\//, "");
}

function isValidJsonLd(ld: Record<string, unknown>): boolean {
  // Must have @type (or @graph with typed items)
  if (!ld["@type"] && !ld["@graph"]) return false;

  // If @context exists, it should reference schema.org
  const ctx = ld["@context"];
  if (ctx) {
    const ctxStr = typeof ctx === "string" ? ctx : JSON.stringify(ctx);
    if (!ctxStr.includes("schema.org")) return false;
  }

  return true;
}
