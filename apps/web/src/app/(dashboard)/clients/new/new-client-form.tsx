"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import {
  createClientSchema,
  type CreateClientValues,
} from "@/lib/validations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewClientForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientValues>({
    resolver: zodResolver(createClientSchema),
  });

  async function onSubmit(data: CreateClientValues) {
    setServerError(null);

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const body = await res.json();

    if (!res.ok) {
      setServerError(body.error?.message ?? "Chyba při vytváření klienta.");
      return;
    }

    router.push(`/clients/${body.data.slug}`);
    router.refresh();
  }

  return (
    <>
      {serverError && (
        <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Název *</Label>
          <Input id="name" placeholder="Název klienta" {...register("name")} />
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
            placeholder="Tón komunikace, styl, cílová skupina..."
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

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Vytvořit klienta
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Zrušit</Link>
          </Button>
        </div>
      </form>
    </>
  );
}
