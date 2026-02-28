import { z } from "zod";

// ── Severity ───────────────────────────────────────────────

export const IssueSeveritySchema = z.enum(["critical", "warning", "info"]);

export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;

// ── Issue ──────────────────────────────────────────────────

export const IssueSchema = z.object({
  severity: IssueSeveritySchema,
  title: z.string(),
  description: z.string(),
  affected_urls: z.array(z.string()),
  recommendation: z.string(),
});

export type Issue = z.infer<typeof IssueSchema>;

// ── CategoryResult ─────────────────────────────────────────

export const CategoryResultSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(IssueSchema),
});

export type CategoryResult = z.infer<typeof CategoryResultSchema>;

// ── PageResult ─────────────────────────────────────────────

export const PageResultSchema = z.object({
  url: z.string(),
  status_code: z.number().int(),
  title: z.string(),
  meta_description: z.string(),
  h1: z.array(z.string()),
  load_time_ms: z.number(),
  content_length: z.number().int(),
  issues: z.array(IssueSchema),
});

export type PageResult = z.infer<typeof PageResultSchema>;

// ── TechnicalAuditResult (job result) ──────────────────────

export const TechnicalAuditSummarySchema = z.object({
  total_pages_crawled: z.number().int(),
  total_issues: z.number().int(),
  critical_count: z.number().int(),
  warning_count: z.number().int(),
  info_count: z.number().int(),
  overall_score: z.number().min(0).max(100),
  crawl_duration_ms: z.number(),
});

export type TechnicalAuditSummary = z.infer<typeof TechnicalAuditSummarySchema>;

export const TechnicalAuditCategoriesSchema = z.object({
  performance: CategoryResultSchema,
  indexability: CategoryResultSchema,
  meta_tags: CategoryResultSchema,
  structured_data: CategoryResultSchema,
  mobile_friendliness: CategoryResultSchema,
  core_web_vitals: CategoryResultSchema,
  internal_linking: CategoryResultSchema,
  broken_links: CategoryResultSchema,
  redirects: CategoryResultSchema,
  sitemap_robots: CategoryResultSchema,
  security: CategoryResultSchema,
});

export type TechnicalAuditCategories = z.infer<
  typeof TechnicalAuditCategoriesSchema
>;

export const TechnicalAuditResultSchema = z.object({
  summary: TechnicalAuditSummarySchema,
  categories: TechnicalAuditCategoriesSchema,
  pages: z.array(PageResultSchema),
  ai_recommendations: z.string(),
});

export type TechnicalAuditResult = z.infer<typeof TechnicalAuditResultSchema>;

// ── Crawled page data model (worker internal) ──────────────

export const RedirectHopSchema = z.object({
  from: z.string(),
  to: z.string(),
  statusCode: z.number().int(),
});

export type RedirectHop = z.infer<typeof RedirectHopSchema>;

export const HreflangEntrySchema = z.object({
  lang: z.string(),
  href: z.string(),
});

export type HreflangEntry = z.infer<typeof HreflangEntrySchema>;

export const LinkDataSchema = z.object({
  href: z.string(),
  anchorText: z.string(),
  isNofollow: z.boolean(),
});

export type LinkData = z.infer<typeof LinkDataSchema>;

export const ImageDataSchema = z.object({
  src: z.string(),
  alt: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  sizeKb: z.number().nullable(),
  format: z.string().nullable(),
});

export type ImageData = z.infer<typeof ImageDataSchema>;

export const JsRenderDiffSchema = z.object({
  contentDiffPercent: z.number(),
  linksOnlyInRendered: z.number().int(),
});

export type JsRenderDiff = z.infer<typeof JsRenderDiffSchema>;

export const CrawledPageSchema = z.object({
  url: z.string(),
  finalUrl: z.string(),
  statusCode: z.number().int(),
  redirectChain: z.array(RedirectHopSchema),
  responseTimeMs: z.number(),
  contentType: z.string(),
  contentLength: z.number().int(),

  // Head
  title: z.string().nullable(),
  metaDescription: z.string().nullable(),
  canonical: z.string().nullable(),
  metaRobots: z.string().nullable(),
  xRobotsTag: z.string().nullable(),
  viewport: z.string().nullable(),
  hreflang: z.array(HreflangEntrySchema),
  maxImagePreview: z.string().nullable(),

  // Content
  h1: z.array(z.string()),
  h2: z.array(z.string()),
  h3: z.array(z.string()),
  wordCount: z.number().int(),
  rawHtmlLength: z.number().int(),

  // Links
  internalLinks: z.array(LinkDataSchema),
  externalLinks: z.array(LinkDataSchema),
  brokenLinks: z.array(z.string()),

  // Images
  images: z.array(ImageDataSchema),

  // Structured data
  jsonLd: z.array(z.record(z.unknown())),
  microdata: z.array(z.record(z.unknown())),

  // JS rendering
  jsRenderDiff: JsRenderDiffSchema.nullable(),

  // Timing
  crawledAt: z.string().datetime(),
  crawlDepth: z.number().int(),
});

export type CrawledPage = z.infer<typeof CrawledPageSchema>;
