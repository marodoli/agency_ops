import Link from "next/link";
import { Globe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ClientCardProps = {
  name: string;
  slug: string;
  domain: string | null;
  isActive: boolean;
  completedJobs: number;
};

export function ClientCard({
  name,
  slug,
  domain,
  isActive,
  completedJobs,
}: ClientCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Aktivní" : "Neaktivní"}
          </Badge>
        </div>
        {domain && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Globe className="size-3.5" />
            {domain}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground-secondary">
          Dokončených jobů:{" "}
          <span className="font-medium text-foreground">{completedJobs}</span>
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/clients/${slug}`}>Otevřít</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
