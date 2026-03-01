"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { ExternalLink } from "lucide-react";
import type { PageResult } from "@agency-ops/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

type CrawlStatsTabProps = {
  pages: PageResult[];
};

const STATUS_COLORS: Record<string, string> = {
  "2xx": "hsl(var(--success))",
  "3xx": "hsl(var(--info))",
  "4xx": "hsl(var(--warning))",
  "5xx": "hsl(var(--error))",
};

const STATUS_CHART_CONFIG: ChartConfig = {
  "2xx": { label: "2xx Success", color: "hsl(var(--success))" },
  "3xx": { label: "3xx Redirect", color: "hsl(var(--info))" },
  "4xx": { label: "4xx Client Error", color: "hsl(var(--warning))" },
  "5xx": { label: "5xx Server Error", color: "hsl(var(--error))" },
};

const RESPONSE_BUCKETS = [
  { label: "<200ms", max: 200, color: "hsl(142, 71%, 45%)" },
  { label: "200-500ms", max: 500, color: "hsl(80, 60%, 45%)" },
  { label: "500ms-1s", max: 1000, color: "hsl(45, 93%, 47%)" },
  { label: "1-2s", max: 2000, color: "hsl(25, 95%, 53%)" },
  { label: ">2s", max: Infinity, color: "hsl(0, 84%, 60%)" },
];

const RESPONSE_CHART_CONFIG: ChartConfig = {
  count: { label: "Stránky", color: "hsl(var(--primary))" },
};

function getStatusBadgeClass(status: number): string {
  if (status >= 500) return "bg-error/10 text-error border-error/20";
  if (status >= 400) return "bg-warning/10 text-warning border-warning/20";
  if (status >= 300) return "bg-info/10 text-info border-info/20";
  return "bg-success/10 text-success border-success/20";
}

function getLoadTimeColor(ms: number): string {
  if (ms > 2000) return "text-error";
  if (ms > 1000) return "text-warning";
  return "text-success";
}

export function CrawlStatsTab({ pages }: CrawlStatsTabProps) {
  const statusData = useMemo(() => {
    const groups: Record<string, number> = {
      "2xx": 0,
      "3xx": 0,
      "4xx": 0,
      "5xx": 0,
    };
    for (const p of pages) {
      const group = `${Math.floor(p.status_code / 100)}xx`;
      if (group in groups) groups[group] = (groups[group] ?? 0) + 1;
    }
    return Object.entries(groups)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] }));
  }, [pages]);

  const responseData = useMemo(() => {
    const counts = RESPONSE_BUCKETS.map(() => 0);
    for (const p of pages) {
      const idx = RESPONSE_BUCKETS.findIndex((b) => p.load_time_ms < b.max);
      const i = idx >= 0 ? idx : RESPONSE_BUCKETS.length - 1;
      counts[i] = (counts[i] ?? 0) + 1;
    }
    return RESPONSE_BUCKETS.map((b, i) => ({
      label: b.label,
      count: counts[i],
      fill: b.color,
    }));
  }, [pages]);

  const top10Slowest = useMemo(
    () =>
      [...pages]
        .sort((a, b) => b.load_time_ms - a.load_time_ms)
        .slice(0, 10),
    [pages],
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Card 1 — Total pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Celkem stránek</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{pages.length}</p>
        </CardContent>
      </Card>

      {/* Card 2 — Status codes pie chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status kódy</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={STATUS_CHART_CONFIG} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ChartContainer>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: d.fill }}
                />
                <span>
                  {d.name}: {d.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card 3 — Response time histogram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doba odezvy</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={RESPONSE_CHART_CONFIG} className="aspect-video max-h-[250px]">
            <BarChart data={responseData}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {responseData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Card 4 — Top 10 slowest pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Top 10 nejpomalejších stránek
          </CardTitle>
        </CardHeader>
        <CardContent>
          {top10Slowest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádná data</p>
          ) : (
            <ul className="space-y-2">
              {top10Slowest.map((page, i) => (
                <li
                  key={page.url}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
                    {i + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 truncate font-mono text-xs text-muted-foreground hover:text-foreground"
                    >
                      <span className="truncate">{page.url}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-xs font-medium ${getLoadTimeColor(page.load_time_ms)}`}
                  >
                    {page.load_time_ms}ms
                  </span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${getStatusBadgeClass(page.status_code)}`}
                  >
                    {page.status_code}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
