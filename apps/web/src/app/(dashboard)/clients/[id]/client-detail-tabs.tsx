"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Loader2 } from "lucide-react";

import {
  updateClientSchema,
  type UpdateClientValues,
} from "@/lib/validations/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Member = {
  userId: string;
  fullName: string | null;
  role: string;
};

type Job = {
  id: string;
  jobType: string;
  status: string;
  progress: number;
  createdAt: string;
  completedAt: string | null;
};

type ClientData = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  brandVoice: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ClientDetailTabsProps = {
  client: ClientData;
  members: Member[];
  jobs: Job[];
  isAdmin: boolean;
};

const jobTypeLabels: Record<string, string> = {
  "seo.technical-audit": "Technický audit",
  "seo.keyword-analysis": "Keyword analýza",
};

const jobStatusLabels: Record<string, string> = {
  queued: "Ve frontě",
  running: "Běží",
  completed: "Dokončen",
  failed: "Selhal",
  cancelled: "Zrušen",
};

const jobStatusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  queued: "outline",
  running: "default",
  completed: "secondary",
  failed: "destructive",
  cancelled: "outline",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ClientDetailTabs({
  client,
  members,
  jobs,
  isAdmin,
}: ClientDetailTabsProps) {
  return (
    <Tabs defaultValue="overview" className="mt-6">
      <TabsList>
        <TabsTrigger value="overview">Přehled</TabsTrigger>
        <TabsTrigger value="jobs">SEO Jobs</TabsTrigger>
        {isAdmin && <TabsTrigger value="settings">Nastavení</TabsTrigger>}
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <OverviewTab client={client} members={members} />
      </TabsContent>

      <TabsContent value="jobs" className="mt-6">
        <JobsTab jobs={jobs} />
      </TabsContent>

      {isAdmin && (
        <TabsContent value="settings" className="mt-6">
          <SettingsTab client={client} />
        </TabsContent>
      )}
    </Tabs>
  );
}

function OverviewTab({
  client,
  members,
}: {
  client: ClientData;
  members: Member[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {client.brandVoice && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Brand voice
            </h3>
            <p className="mt-1 text-sm">{client.brandVoice}</p>
          </div>
        )}

        {client.notes && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Poznámky
            </h3>
            <p className="mt-1 text-sm">{client.notes}</p>
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Vytvořen
            </h3>
            <p className="mt-1 text-sm">
              {format(new Date(client.createdAt), "d. MMMM yyyy", {
                locale: cs,
              })}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Poslední úprava
            </h3>
            <p className="mt-1 text-sm">
              {format(new Date(client.updatedAt), "d. MMMM yyyy", {
                locale: cs,
              })}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground">
          Tým ({members.length})
        </h3>
        <div className="mt-3 space-y-3">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center gap-3">
              <Avatar size="sm">
                <AvatarFallback>
                  {getInitials(member.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.fullName ?? "Bez jména"}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {member.role === "admin" ? "Admin" : "Člen"}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function JobsTab({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Zatím žádné SEO joby pro tohoto klienta.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Typ</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Vytvořen</TableHead>
          <TableHead>Dokončen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-medium">
              {jobTypeLabels[job.jobType] ?? job.jobType}
            </TableCell>
            <TableCell>
              <Badge variant={jobStatusVariant[job.status] ?? "outline"}>
                {jobStatusLabels[job.status] ?? job.status}
              </Badge>
            </TableCell>
            <TableCell>{job.progress}%</TableCell>
            <TableCell>
              {format(new Date(job.createdAt), "d. M. yyyy HH:mm", {
                locale: cs,
              })}
            </TableCell>
            <TableCell>
              {job.completedAt
                ? format(new Date(job.completedAt), "d. M. yyyy HH:mm", {
                    locale: cs,
                  })
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SettingsTab({ client }: { client: ClientData }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateClientValues>({
    resolver: zodResolver(updateClientSchema),
    defaultValues: {
      name: client.name,
      domain: client.domain ?? "",
      brandVoice: client.brandVoice ?? "",
      notes: client.notes ?? "",
      isActive: client.isActive,
    },
  });

  async function onSubmit(data: UpdateClientValues) {
    setServerError(null);
    setSuccess(false);

    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setServerError(body.error?.message ?? "Chyba při ukládání.");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  async function handleDeactivate() {
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="max-w-lg">
      {serverError && (
        <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-success/10 px-4 py-3 text-sm text-success">
          Změny byly uloženy.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Název *</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="domain">Doména</Label>
          <Input
            id="domain"
            placeholder="example.com"
            {...register("domain")}
          />
          {errors.domain && (
            <p className="text-xs text-destructive">{errors.domain.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="brandVoice">Brand voice</Label>
          <Textarea
            id="brandVoice"
            placeholder="Tón komunikace, styl..."
            rows={3}
            {...register("brandVoice")}
          />
          {errors.brandVoice && (
            <p className="text-xs text-destructive">
              {errors.brandVoice.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Poznámky</Label>
          <Textarea
            id="notes"
            placeholder="Obecné poznámky ke klientovi..."
            rows={3}
            {...register("notes")}
          />
          {errors.notes && (
            <p className="text-xs text-destructive">{errors.notes.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Uložit změny
        </Button>
      </form>

      {client.isActive && (
        <>
          <Separator className="my-8" />
          <div>
            <h3 className="text-sm font-medium text-destructive">
              Nebezpečná zóna
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Deaktivace skryje klienta ze seznamu. Data zůstanou zachována.
            </p>
            <Button
              variant="destructive"
              className="mt-3"
              onClick={handleDeactivate}
            >
              Deaktivovat klienta
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
