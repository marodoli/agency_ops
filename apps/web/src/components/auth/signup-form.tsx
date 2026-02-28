"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Mail, User } from "lucide-react";
import Link from "next/link";

import { signupSchema, type SignupValues } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupValues) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
        },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push("/login?message=check-email");
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <p className="text-lg font-semibold text-secondary">MacroConsulting</p>
        <CardTitle className="text-2xl">Registrace</CardTitle>
      </CardHeader>
      <CardContent>
        {serverError && (
          <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Celé jméno</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="Jan Novák"
                className="pl-9"
                autoComplete="name"
                {...register("fullName")}
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-destructive">
                {errors.fullName.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="vas@email.cz"
                className="pl-9"
                autoComplete="email"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Heslo</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="min. 8 znaků"
                className="pl-9"
                autoComplete="new-password"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="animate-spin" />}
            Vytvořit účet
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Již máte účet?{" "}
          <Link
            href="/login"
            className="text-secondary hover:text-secondary/80"
          >
            Přihlaste se
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
