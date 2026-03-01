"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Play, Zap } from "lucide-react";

import {
  jobLauncherSchema,
  type JobLauncherValues,
} from "@/lib/validations/job";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClientOption = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
};

const MAX_PAGES_OPTIONS = [10, 50, 100, 250, 500] as const;

function estimateTime(maxPages: number): string {
  if (maxPages <= 10) return "~1–2 min";
  if (maxPages <= 50) return "~3–5 min";
  if (maxPages <= 100) return "~5–10 min";
  if (maxPages <= 250) return "~10–20 min";
  return "~15–30 min";
}

function cleanDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export function JobLauncherForm({
  clients,
  jobType = "seo.technical-audit",
}: {
  clients: ClientOption[];
  jobType?: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JobLauncherValues>({
    resolver: zodResolver(jobLauncherSchema),
    defaultValues: {
      client_id: "",
      domain: "",
      crawl_depth: 3,
      max_pages: 100,
      custom_instructions: "",
    },
  });

  // Auto-fill domain when client changes
  const clientId = watch("client_id");
  const maxPages = watch("max_pages");

  useEffect(() => {
    const selected = clients.find((c) => c.id === clientId);
    if (selected?.domain) {
      setValue("domain", selected.domain);
    }
  }, [clientId, clients, setValue]);

  async function onSubmit(data: JobLauncherValues) {
    setServerError(null);

    const domain = cleanDomain(data.domain);
    if (!domain) {
      setServerError("Zadejte platnou doménu.");
      return;
    }

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: data.client_id,
        job_type: jobType,
        params: {
          domain,
          crawl_depth: data.crawl_depth,
          max_pages: data.max_pages,
          custom_instructions: data.custom_instructions || undefined,
        },
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      setServerError(body.error?.message ?? "Chyba při vytváření jobu.");
      return;
    }

    const client = clients.find((c) => c.id === data.client_id);
    router.push(`/clients/${client?.slug ?? data.client_id}/jobs/${body.data.id}`);
  }

  return (
    <>
      {serverError && (
        <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
        {/* Client selector */}
        <div className="grid gap-2">
          <Label htmlFor="client_id">Klient *</Label>
          <Controller
            control={control}
            name="client_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="client_id">
                  <SelectValue placeholder="Vyberte klienta" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.client_id && (
            <p className="text-xs text-destructive">
              {errors.client_id.message}
            </p>
          )}
        </div>

        {/* Domain */}
        <div className="grid gap-2">
          <Label htmlFor="domain">Doména *</Label>
          <Input
            id="domain"
            placeholder="example.com"
            {...register("domain")}
          />
          {errors.domain && (
            <p className="text-xs text-destructive">{errors.domain.message}</p>
          )}
        </div>

        {/* Crawl depth + Max pages — side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="crawl_depth">Hloubka crawlu</Label>
            <Controller
              control={control}
              name="crawl_depth"
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="crawl_depth">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="max_pages">Max stránek</Label>
            <Controller
              control={control}
              name="max_pages"
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="max_pages">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAX_PAGES_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Custom instructions */}
        <div className="grid gap-2">
          <Label htmlFor="custom_instructions">
            Poznámky a kontext (volitelné)
          </Label>
          <Textarea
            id="custom_instructions"
            placeholder="E-shop na Shopify, cílí na CZ trh, hlavní produkt jsou boty..."
            rows={3}
            {...register("custom_instructions")}
          />
          {errors.custom_instructions && (
            <p className="text-xs text-destructive">
              {errors.custom_instructions.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Spustit analýzu
          </Button>
        </div>

        {/* Estimated time */}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="size-3.5" />
          Odhadovaný čas: {estimateTime(maxPages)} pro {maxPages} stránek
        </p>
      </form>
    </>
  );
}
