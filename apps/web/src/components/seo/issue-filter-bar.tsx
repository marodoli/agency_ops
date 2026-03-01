"use client";

import { Search, X, Filter } from "lucide-react";
import type { TechnicalAuditCategories } from "@agency-ops/shared";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_LABELS } from "@/lib/seo-utils";

type SeverityFilter = "all" | "critical" | "warning" | "info";

type IssueFilterBarProps = {
  severityFilter: SeverityFilter;
  onSeverityChange: (value: SeverityFilter) => void;
  selectedCategories: Set<string>;
  onCategoriesChange: (categories: Set<string>) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts: { total: number; critical: number; warning: number; info: number };
};

const SEVERITY_OPTIONS: {
  value: SeverityFilter;
  label: string;
  countKey: keyof IssueFilterBarProps["counts"];
  activeClass: string;
}[] = [
  {
    value: "all",
    label: "Vše",
    countKey: "total",
    activeClass: "bg-foreground text-background",
  },
  {
    value: "critical",
    label: "Kritické",
    countKey: "critical",
    activeClass: "bg-error/10 text-error border-error/20",
  },
  {
    value: "warning",
    label: "Varování",
    countKey: "warning",
    activeClass: "bg-warning/10 text-warning border-warning/20",
  },
  {
    value: "info",
    label: "Info",
    countKey: "info",
    activeClass: "bg-info/10 text-info border-info/20",
  },
];

export function IssueFilterBar({
  severityFilter,
  onSeverityChange,
  selectedCategories,
  onCategoriesChange,
  searchQuery,
  onSearchChange,
  counts,
}: IssueFilterBarProps) {
  const categoryKeys = Object.keys(CATEGORY_LABELS) as (keyof TechnicalAuditCategories)[];

  function toggleCategory(key: string) {
    const next = new Set(selectedCategories);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onCategoriesChange(next);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Text search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Hledat v nálezech..."
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Severity toggle */}
      <div className="flex rounded-lg border p-1">
        {SEVERITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSeverityChange(opt.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              severityFilter === opt.value
                ? opt.activeClass
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label} ({counts[opt.countKey]})
          </button>
        ))}
      </div>

      {/* Category dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="size-4" />
            Kategorie
            {selectedCategories.size > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 text-xs">
                {selectedCategories.size}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {categoryKeys.map((key) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={selectedCategories.has(key)}
              onCheckedChange={() => toggleCategory(key)}
            >
              {CATEGORY_LABELS[key]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export type { SeverityFilter };
