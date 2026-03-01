import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Globe, Calendar, Clock, FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type ReportHeaderProps = {
  domain: string;
  clientName: string;
  completedAt: string;
  durationMs: number;
  totalPagesCrawled: number;
};

export function ReportHeader({
  domain,
  clientName,
  completedAt,
  durationMs,
  totalPagesCrawled,
}: ReportHeaderProps) {
  const durationSeconds = Math.round(durationMs / 1000);
  const formattedDate = format(new Date(completedAt), "d. MMMM yyyy, HH:mm", {
    locale: cs,
  });

  return (
    <Card>
      <CardContent className="grid gap-2">
        <h1 className="text-xl font-semibold">
          Technická SEO analýza: {domain}
        </h1>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Globe className="size-3.5" />
            {clientName}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {durationSeconds}s
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="size-3.5" />
            {totalPagesCrawled} stránek
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
