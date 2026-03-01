import type { Issue } from "@agency-ops/shared";
import type { AnalyzerInput } from "./base";

/**
 * AEO/GEO analyzer — checks AI bot access (GPTBot, ClaudeBot, PerplexityBot),
 * llms.txt, author schema, E-E-A-T signals, and external citations.
 */
export function analyzeAeoGeo(input: AnalyzerInput): Issue[] {
  const { pages, robotsTxt } = input;
  const issues: Issue[] = [];

  const validPages = pages.filter((p) => p.statusCode === 200);

  // ── GPTBot blocked in robots.txt → WARNING ───────────────────
  if (robotsTxt && isBotBlocked(robotsTxt, "GPTBot")) {
    issues.push({
      severity: "warning",
      title: "GPTBot blokován v robots.txt",
      description:
        "robots.txt blokuje GPTBot (OpenAI). Web nebude zahrnut do tréninkových dat a může mít nižší viditelnost v ChatGPT a AI vyhledávání.",
      affected_urls: [],
      recommendation:
        "Zvažte povolení GPTBot, pokud chcete být viditelní v AI odpovědích. Případně povolte pouze crawling bez tréningu pomocí specifických direktiv.",
    });
  }

  // ── ClaudeBot blocked → WARNING ──────────────────────────────
  if (robotsTxt && isBotBlocked(robotsTxt, "ClaudeBot")) {
    issues.push({
      severity: "warning",
      title: "ClaudeBot blokován v robots.txt",
      description:
        "robots.txt blokuje ClaudeBot (Anthropic). Web nebude indexován pro Claude AI a může mít nižší viditelnost v AI odpovědích.",
      affected_urls: [],
      recommendation:
        "Zvažte povolení ClaudeBot pro lepší viditelnost v AI odpovědích od Claude.",
    });
  }

  // ── PerplexityBot blocked → WARNING ──────────────────────────
  if (robotsTxt && isBotBlocked(robotsTxt, "PerplexityBot")) {
    issues.push({
      severity: "warning",
      title: "PerplexityBot blokován v robots.txt",
      description:
        "robots.txt blokuje PerplexityBot. Web nebude zahrnut ve výsledcích Perplexity AI vyhledávání.",
      affected_urls: [],
      recommendation:
        "Zvažte povolení PerplexityBot pro viditelnost v AI-powered vyhledávání.",
    });
  }

  // ── Missing llms.txt → INFO ──────────────────────────────────
  // Check if any page hints at llms.txt existence (we can't directly fetch it,
  // but we can check if /llms.txt was in the crawl)
  const hasLlmsTxt = pages.some((p) => {
    try {
      return new URL(p.finalUrl).pathname === "/llms.txt";
    } catch {
      return false;
    }
  });
  if (!hasLlmsTxt) {
    const homepage = validPages.find((p) => p.crawlDepth === 0);
    issues.push({
      severity: "info",
      title: "Chybějící llms.txt",
      description:
        "Web nemá soubor llms.txt. Tento soubor pomáhá AI modelům porozumět obsahu a struktuře webu pro přesnější odpovědi.",
      affected_urls: homepage ? [homepage.finalUrl] : [],
      recommendation:
        "Vytvořte soubor /llms.txt s popisem webu, jeho účelu, klíčových stránek a preferovaného formátu citací.",
    });
  }

  // ── Missing author schema on articles → INFO ──────────────────
  const articlePatterns = ["/blog", "/clanek", "/clanky", "/article", "/posts", "/aktuality", "/novinky"];
  const articlePages = validPages.filter((p) => {
    try {
      const path = new URL(p.finalUrl).pathname.toLowerCase();
      return articlePatterns.some((ap) => path.includes(ap));
    } catch {
      return false;
    }
  });

  const articlesWithoutAuthor: string[] = [];
  for (const page of articlePages) {
    const hasAuthor = page.jsonLd.some((ld) => {
      return hasAuthorInSchema(ld);
    });
    if (!hasAuthor) {
      articlesWithoutAuthor.push(page.finalUrl);
    }
  }
  if (articlesWithoutAuthor.length > 0) {
    issues.push({
      severity: "info",
      title: "Články bez author schema",
      description: `${articlesWithoutAuthor.length} článků nemá author informaci ve structured data. Author schema posiluje E-E-A-T signály pro AI a vyhledávače.`,
      affected_urls: articlesWithoutAuthor,
      recommendation:
        "Přidejte author property do Article/BlogPosting schema s name, url a případně sameAs odkazy na profesní profily.",
    });
  }

  // ── Missing "O nás" page signals → INFO ──────────────────────
  const aboutPatterns = ["/o-nas", "/about", "/about-us", "/o-firme", "/o-spolecnosti", "/tym", "/team"];
  const hasAboutPage = validPages.some((p) => {
    try {
      const path = new URL(p.finalUrl).pathname.toLowerCase();
      return aboutPatterns.some((ap) => path === ap || path === `${ap}/`);
    } catch {
      return false;
    }
  });
  if (!hasAboutPage && validPages.length > 3) {
    issues.push({
      severity: "info",
      title: "Chybějící 'O nás' stránka — slabé E-E-A-T signály",
      description:
        "Web nemá zřejmou stránku 'O nás' (About Us). E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signály jsou důležité pro AI i tradiční vyhledávače.",
      affected_urls: [],
      recommendation:
        "Vytvořte stránku 'O nás' s informacemi o firmě, týmu, expertíze a referencích. Přidejte Organization schema.",
    });
  }

  // ── No external citations in content → INFO ──────────────────
  const contentPages = validPages.filter(
    (p) => p.wordCount >= 300 && p.crawlDepth > 0,
  );
  const pagesWithoutCitations: string[] = [];
  for (const page of contentPages) {
    if (page.externalLinks.length === 0) {
      pagesWithoutCitations.push(page.finalUrl);
    }
  }
  if (pagesWithoutCitations.length > 0 && contentPages.length > 0) {
    // Only flag if most content pages lack citations
    const ratio = pagesWithoutCitations.length / contentPages.length;
    if (ratio > 0.5) {
      issues.push({
        severity: "info",
        title: "Obsahové stránky bez externích citací",
        description: `${pagesWithoutCitations.length} z ${contentPages.length} obsahových stránek nemá žádné externí odkazy. Citace autoritativních zdrojů posilují důvěryhodnost obsahu.`,
        affected_urls: pagesWithoutCitations.slice(0, 20),
        recommendation:
          "Přidejte odkazy na relevantní autoritativní zdroje (studie, statistiky, oborové weby). Citace zvyšují E-E-A-T a pomáhají AI modelům ověřit informace.",
      });
    }
  }

  return issues;
}

// ── Helpers ──────────────────────────────────────────────────

function isBotBlocked(robotsTxt: string, botName: string): boolean {
  let inTargetBot = false;

  for (const line of robotsTxt.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith("user-agent:")) {
      const agent = trimmed.slice("user-agent:".length).trim();
      inTargetBot =
        agent === botName || agent === "*" ? false : agent === botName;
      // Only check specific bot blocks, not wildcard
      if (agent === botName) inTargetBot = true;
      else inTargetBot = false;
    } else if (inTargetBot && trimmed.toLowerCase().startsWith("disallow:")) {
      const path = trimmed.slice("disallow:".length).trim();
      if (path === "/" || path === "/*") return true;
    }
  }

  return false;
}

function hasAuthorInSchema(ld: Record<string, unknown>): boolean {
  if (ld["author"]) return true;

  // Check @graph
  const graph = ld["@graph"];
  if (Array.isArray(graph)) {
    for (const item of graph) {
      if (
        typeof item === "object" &&
        item !== null &&
        "author" in item
      ) {
        return true;
      }
    }
  }

  return false;
}
