import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AUDIT_LIMITATIONS } from "@/lib/seo-utils";

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
          {AUDIT_LIMITATIONS.map((text, i) => (
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
