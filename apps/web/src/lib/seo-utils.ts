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

// ── Severity labels (Czech) ───────────────────────────────

export const SEVERITY_LABELS: Record<string, string> = {
  critical: "Kritický",
  warning: "Varování",
  info: "Info",
};

// ── Scored issues ────────────────────────────────────────

export type ScoredIssue = {
  title: string;
  severity: string;
  impact: number;
  effort: number;
  quadrant: string;
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export { SEVERITY_ORDER };

/**
 * Parse the "## Hodnocení issues (Impact × Effort)" section from AI markdown.
 * Returns a map keyed by lowercase issue title.
 */
export function parseIssueScores(
  markdown: string,
): Record<string, ScoredIssue> {
  const result: Record<string, ScoredIssue> = {};

  const sectionMatch = markdown.match(
    /## Hodnocení issues \(Impact × Effort\)\n([\s\S]*?)(?=\n## |$)/,
  );
  if (!sectionMatch?.[1]) return result;

  const lineRegex =
    /- \*\*(.+?)\*\* \[(\w+)\] — Impact: (\d)\/5, Effort: (\d)\/5 → (.+)/g;
  let match;
  while ((match = lineRegex.exec(sectionMatch[1])) !== null) {
    const title = match[1];
    const severity = match[2];
    const impact = match[3];
    const effort = match[4];
    const quadrant = match[5];
    if (!title || !severity || !impact || !effort || !quadrant) continue;
    result[title.toLowerCase()] = {
      title,
      severity: severity.toLowerCase(),
      impact: Number(impact),
      effort: Number(effort),
      quadrant: quadrant.trim(),
    };
  }

  return result;
}

export function getQuadrantColor(quadrant: string): string {
  switch (quadrant) {
    case "Quick Win":
      return "text-success";
    case "Major Project":
      return "text-warning";
    case "Fill-in":
      return "text-info";
    case "Time Waster":
      return "text-error";
    default:
      return "text-muted-foreground";
  }
}

export function getQuadrantBg(quadrant: string): string {
  switch (quadrant) {
    case "Quick Win":
      return "bg-success/10";
    case "Major Project":
      return "bg-warning/10";
    case "Fill-in":
      return "bg-info/10";
    case "Time Waster":
      return "bg-error/10";
    default:
      return "bg-muted";
  }
}

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

// ── Audit limitations (shared between UI component and PDF) ──

export const AUDIT_LIMITATIONS = [
  "Bez přístupu ke Google Search Console – nelze ověřit reálný stav indexace Google.",
  "Bez přístupu k server logům – nelze analyzovat crawl budget.",
  "JS rendering na vzorku – některé JS issues mohou být přehlédnuty.",
  "Near-duplicate detection není implementován.",
  "PageSpeed data jsou laboratorní (lab), ne polní (field/CrUX).",
];

// ── AI recommendations parser ──────────────────────────────

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
