import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LIMITATIONS = [
  "Bez přístupu ke Google Search Console – nelze ověřit reálný stav indexace Google.",
  "Bez přístupu k server logům – nelze analyzovat crawl budget.",
  "JS rendering na vzorku – některé JS issues mohou být přehlédnuty.",
  "Near-duplicate detection není implementován.",
  "PageSpeed data jsou laboratorní (lab), ne polní (field/CrUX).",
];

export function AuditLimitations() {
  return (
    <Card className="border-warning/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-5 text-warning" />
          Omezení analýzy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {LIMITATIONS.map((text, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
              {text}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
