import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import pino from "pino";
import type { Issue } from "@agency-ops/shared";

const logger = pino({ name: "ai" });

// ── Anthropic client ─────────────────────────────────────────

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }
  return new Anthropic({ apiKey });
}

// ── AI response schema ───────────────────────────────────────

const ScoredIssueSchema = z.object({
  title: z.string(),
  severity: z.enum(["critical", "warning", "info"]),
  impact: z.number().int().min(1).max(5),
  effort: z.number().int().min(1).max(5),
  quadrant: z.enum(["quick_win", "major_project", "fill_in", "time_waster"]),
  recommendation: z.string(),
});

const ActionPlanSchema = z.object({
  sprint_1: z.array(z.string()),
  sprint_2: z.array(z.string()),
  backlog: z.array(z.string()),
});

export const AiReportSchema = z.object({
  executive_summary: z.string(),
  scored_issues: z.array(ScoredIssueSchema),
  action_plan: ActionPlanSchema,
  recommendations_text: z.string(),
});

export type AiReport = z.infer<typeof AiReportSchema>;

// ── Input types ──────────────────────────────────────────────

export type CrawlStats = {
  totalPagesCrawled: number;
  domain: string;
  crawlDepthUsed: number;
  crawlDurationMs: number;
};

export type GenerateReportInput = {
  issues: Issue[];
  crawlStats: CrawlStats;
  techStack?: string;
  customInstructions?: string;
};

// ── System prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `Jsi senior SEO analytik v digitální marketingové agentuře.
Dostáváš strukturovaná crawl data a seznamy issues z automatizovaného technického SEO auditu.

Tvůj úkol:

1. Napiš executive summary (3–5 vět) o celkovém technickém SEO zdraví webu.
2. Ohodnoť každý issue na škále Impact (1–5) a Effort (1–5):
   - Impact: rozsah (globální šablona vs. jedna stránka), komerční relevance, vliv na AI vyhledávání
   - Effort: potřebná dev kapacita, obsahová náročnost, úroveň rizika
3. Přiřaď každý issue do kvadrantu:
   - quick_win (vysoký impact, nízký effort)
   - major_project (vysoký impact, vysoký effort)
   - fill_in (nízký impact, nízký effort)
   - time_waster (nízký impact, vysoký effort)
4. Vygeneruj prioritizovaný akční plán:
   - Sprint 1: Všechny Quick Wins + top 3 Critical Major Projects
   - Sprint 2: Zbývající Major Projects
   - Backlog: Fill-ins
   (Time Wastery vynech z akčního plánu)
5. Napiš akční doporučení v češtině.

DŮLEŽITÉ:
- Veškerý výstup MUSÍ být v ČEŠTINĚ.
- Odpověz POUZE validním JSON objektem, bez markdown code fences, bez komentářů.
- Formát odpovědi:
{
  "executive_summary": "...",
  "scored_issues": [
    {
      "title": "název issue",
      "severity": "critical|warning|info",
      "impact": 1-5,
      "effort": 1-5,
      "quadrant": "quick_win|major_project|fill_in|time_waster",
      "recommendation": "konkrétní doporučení"
    }
  ],
  "action_plan": {
    "sprint_1": ["akce 1", "akce 2"],
    "sprint_2": ["akce 3"],
    "backlog": ["akce 4"]
  },
  "recommendations_text": "Celkový text doporučení pro klienta..."
}`;

// ── Main function ────────────────────────────────────────────

const MODEL = "claude-sonnet-4-6" as const;
const MAX_TOKENS = 4096;
const MAX_RETRIES = 2;

export async function generateSeoReport(
  input: GenerateReportInput,
): Promise<AiReport | null> {
  const { issues, crawlStats, techStack, customInstructions } = input;

  if (issues.length === 0) {
    logger.info("No issues to analyze, skipping AI compilation");
    return null;
  }

  const userMessage = buildUserMessage(
    issues,
    crawlStats,
    techStack,
    customInstructions,
  );

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      logger.info(
        { attempt, issueCount: issues.length, model: MODEL },
        "Calling Claude API for SEO report",
      );

      const client = getClient();
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text block in Claude response");
      }

      const rawText = textBlock.text.trim();
      const parsed = parseJsonResponse(rawText);
      const validated = AiReportSchema.parse(parsed);

      logger.info(
        {
          scoredIssues: validated.scored_issues.length,
          sprint1Actions: validated.action_plan.sprint_1.length,
          tokensUsed: response.usage.output_tokens,
        },
        "AI report generated successfully",
      );

      return validated;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        { attempt, error: message },
        "AI report generation attempt failed",
      );

      if (attempt <= MAX_RETRIES) {
        // Wait before retry (exponential backoff)
        await sleep(1000 * attempt);
      }
    }
  }

  // All retries exhausted — log and return null (fallback: report without AI)
  const errorMsg =
    lastError instanceof Error ? lastError.message : String(lastError);
  logger.error(
    { error: errorMsg, retries: MAX_RETRIES },
    "AI report generation failed after all retries, proceeding without AI summary",
  );

  return null;
}

// ── Helpers ──────────────────────────────────────────────────

function buildUserMessage(
  issues: Issue[],
  crawlStats: CrawlStats,
  techStack?: string,
  customInstructions?: string,
): string {
  const issuesByCategory = groupIssues(issues);

  const parts: string[] = [];

  parts.push(`## Crawl statistiky
- Doména: ${crawlStats.domain}
- Celkem procrawlováno stránek: ${crawlStats.totalPagesCrawled}
- Hloubka crawlu: ${crawlStats.crawlDepthUsed}
- Doba crawlu: ${Math.round(crawlStats.crawlDurationMs / 1000)}s`);

  if (techStack) {
    parts.push(`\n## Technologie webu\n${techStack}`);
  }

  if (customInstructions) {
    parts.push(`\n## Kontext od klienta\n${customInstructions}`);
  }

  parts.push(`\n## Souhrn issues
- Celkem: ${issues.length}
- Critical: ${issues.filter((i) => i.severity === "critical").length}
- Warning: ${issues.filter((i) => i.severity === "warning").length}
- Info: ${issues.filter((i) => i.severity === "info").length}`);

  parts.push(`\n## Issues podle kategorie\n${JSON.stringify(issuesByCategory, null, 2)}`);

  return parts.join("\n");
}

function groupIssues(
  issues: Issue[],
): Record<string, { title: string; severity: string; affected_count: number; recommendation: string }[]> {
  const grouped: Record<
    string,
    { title: string; severity: string; affected_count: number; recommendation: string }[]
  > = {
    critical: [],
    warning: [],
    info: [],
  };

  for (const issue of issues) {
    const entry = {
      title: issue.title,
      severity: issue.severity,
      affected_count: issue.affected_urls.length,
      recommendation: issue.recommendation,
    };
    const group = grouped[issue.severity];
    if (group) {
      group.push(entry);
    }
  }

  return grouped;
}

function parseJsonResponse(raw: string): unknown {
  // Strip markdown code fences if present (despite instructions)
  let cleaned = raw;
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
  }
  return JSON.parse(cleaned.trim());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
