"use client";

import { useState } from "react";
import { Info, Zap, Target, Archive } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { parseAiRecommendations } from "@/lib/seo-utils";

type ActionPlanProps = {
  aiRecommendations: string;
};

function ChecklistSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
}) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-2 font-medium">
        <Icon className="size-4" />
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <Checkbox
              id={`${title}-${i}`}
              checked={checked[i] ?? false}
              onCheckedChange={(val) =>
                setChecked((prev) => ({ ...prev, [i]: val === true }))
              }
              className="mt-0.5"
            />
            <label
              htmlFor={`${title}-${i}`}
              className={`text-sm leading-relaxed ${checked[i] ? "text-muted-foreground line-through" : ""}`}
            >
              {item}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActionPlan({ aiRecommendations }: ActionPlanProps) {
  // Fallback: AI wasn't available
  if (aiRecommendations.startsWith("AI analýza nebyla k dispozici")) {
    return (
      <Card className="bg-info/10 border-info/20">
        <CardContent className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 text-info" />
          <p className="text-sm">{aiRecommendations}</p>
        </CardContent>
      </Card>
    );
  }

  const parsed = parseAiRecommendations(aiRecommendations);

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {parsed.executiveSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground-secondary">
              {parsed.executiveSummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Plan */}
      {(parsed.sprint1.length > 0 ||
        parsed.sprint2.length > 0 ||
        parsed.backlog.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Akční plán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ChecklistSection
              title="Sprint 1 (Quick Wins)"
              icon={Zap}
              items={parsed.sprint1}
            />
            <ChecklistSection
              title="Sprint 2"
              icon={Target}
              items={parsed.sprint2}
            />

            {/* Backlog — plain bullets, no checkboxes */}
            {parsed.backlog.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-medium">
                  <Archive className="size-4" />
                  Backlog
                </h4>
                <ul className="space-y-1.5">
                  {parsed.backlog.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-foreground-secondary"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
