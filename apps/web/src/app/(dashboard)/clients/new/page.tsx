import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewClientForm } from "./new-client-form";

export const metadata: Metadata = {
  title: "Nový klient | Agency Ops",
};

export default async function NewClientPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Admin check — only admins can create clients
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">Nový klient</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Vyplňte údaje o novém klientovi.
      </p>
      <div className="mt-6">
        <NewClientForm />
      </div>
    </div>
  );
}
