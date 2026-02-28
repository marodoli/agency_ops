"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";

const segmentLabels: Record<string, string> = {
  "": "Dashboard",
  seo: "SEO",
  "technical-audit": "Technický audit",
  "keyword-analysis": "Keyword analýza",
  settings: "Nastavení",
};

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs =
    segments.length === 0
      ? [{ label: "Dashboard" }]
      : segments.map((segment) => ({
          label: segmentLabels[segment] ?? segment,
        }));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden"
      >
        <Menu className="size-5" />
        <span className="sr-only">Otevřít menu</span>
      </Button>

      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span>/</span>}
            <span
              className={
                i === breadcrumbs.length - 1
                  ? "font-medium text-foreground"
                  : undefined
              }
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>
    </header>
  );
}
