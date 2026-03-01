import type {
  IssueSeverity,
  TechnicalAuditCategories,
} from "@agency-ops/shared";

// ── Score gradient ─────────────────────────────────────────
// 0–39 → error (Špatný), 40–69 → warning (Ke zlepšení)
// 70–89 → info (Dobrý), 90–100 → success (Výborný)

export function getScoreColor(score: number): string {
  if (score >= 90) return "text-success";
  if (score >= 70) return "text-info";
  if (score >= 40) return "text-warning";
  return "text-error";
}

export function getScoreBg(score: number): string {
  if (score >= 90) return "bg-success/10";
  if (score >= 70) return "bg-info/10";
  if (score >= 40) return "bg-warning/10";
  return "bg-error/10";
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Výborný";
  if (score >= 70) return "Dobrý";
  if (score >= 40) return "Ke zlepšení";
  return "Špatný";
}

// ── Severity helpers ───────────────────────────────────────

export function getSeverityColor(severity: IssueSeverity): string {
  switch (severity) {
    case "critical":
      return "text-error";
    case "warning":
      return "text-warning";
    case "info":
      return "text-info";
  }
}

export function getSeverityBg(severity: IssueSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-error/10";
    case "warning":
      return "bg-warning/10";
    case "info":
      return "bg-info/10";
  }
}

export function getSeverityBorder(severity: IssueSeverity): string {
  switch (severity) {
    case "critical":
      return "border-error";
    case "warning":
      return "border-warning";
    case "info":
      return "border-info";
  }
}

// ── Category labels (Czech) ────────────────────────────────

export const CATEGORY_LABELS: Record<
  keyof TechnicalAuditCategories,
  string
> = {
  performance: "Rychlost a výkon",
  indexability: "Indexace a viditelnost",
  meta_tags: "Meta tagy",
  structured_data: "Strukturovaná data",
  mobile_friendliness: "Mobilní přívětivost",
  core_web_vitals: "Core Web Vitals",
  internal_linking: "Interní prolinkování",
  broken_links: "Rozbité odkazy",
  redirects: "Přesměrování",
  sitemap_robots: "Sitemap a robots.txt",
  security: "Bezpečnost",
};

// ── AI recommendations parser ──────────────────────────────

export type ParsedRecommendations = {
  executiveSummary: string;
  sprint1: string[];
  sprint2: string[];
  backlog: string[];
};

function extractListItems(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

export function parseAiRecommendations(markdown: string): ParsedRecommendations {
  const result: ParsedRecommendations = {
    executiveSummary: "",
    sprint1: [],
    sprint2: [],
    backlog: [],
  };

  // Extract Executive Summary (between ## Executive Summary and next ##)
  const summaryMatch = markdown.match(
    /## Executive Summary\n([\s\S]*?)(?=\n## |$)/,
  );
  if (summaryMatch?.[1]) {
    result.executiveSummary = summaryMatch[1].trim();
  }

  // Extract Sprint 1
  const sprint1Match = markdown.match(
    /### Sprint 1[^\n]*\n([\s\S]*?)(?=\n### |$)/,
  );
  if (sprint1Match?.[1]) {
    result.sprint1 = extractListItems(sprint1Match[1]);
  }

  // Extract Sprint 2
  const sprint2Match = markdown.match(
    /### Sprint 2[^\n]*\n([\s\S]*?)(?=\n### |$)/,
  );
  if (sprint2Match?.[1]) {
    result.sprint2 = extractListItems(sprint2Match[1]);
  }

  // Extract Backlog
  const backlogMatch = markdown.match(
    /### Backlog[^\n]*\n([\s\S]*?)(?=\n## |$)/,
  );
  if (backlogMatch?.[1]) {
    result.backlog = extractListItems(backlogMatch[1]);
  }

  return result;
}
