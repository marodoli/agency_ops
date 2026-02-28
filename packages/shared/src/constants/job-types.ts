import type { JobType } from "../types/job";

export interface JobTypeConfig {
  type: JobType;
  label: string;
  description: string;
  defaultTimeoutMs: number;
  maxRetries: number;
}

export const JOB_TYPE_REGISTRY: Record<JobType, JobTypeConfig> = {
  "seo.technical-audit": {
    type: "seo.technical-audit",
    label: "Technická SEO analýza",
    description: "Kompletní technický audit webu – crawl, analýza, AI doporučení",
    defaultTimeoutMs: 900_000, // 15 min
    maxRetries: 3,
  },
  "seo.keyword-analysis": {
    type: "seo.keyword-analysis",
    label: "Analýza klíčových slov",
    description: "Výzkum a analýza klíčových slov pro SEO strategii",
    defaultTimeoutMs: 600_000, // 10 min
    maxRetries: 3,
  },
} as const;

export const JOB_TYPES = Object.keys(JOB_TYPE_REGISTRY) as JobType[];
