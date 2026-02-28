import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createClientSchema } from "@/lib/validations/client";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  // RLS automatically filters by user membership
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, slug, domain, is_active, created_at, updated_at")
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: error.code } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  // Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: { message: "Forbidden", code: "FORBIDDEN" } },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = createClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          message: parsed.error.errors[0]?.message ?? "Neplatná data.",
          code: "VALIDATION_ERROR",
        },
      },
      { status: 400 },
    );
  }

  const slug = parsed.data.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: parsed.data.name,
      slug,
      domain: parsed.data.domain || null,
      brand_voice: parsed.data.brandVoice || null,
      notes: parsed.data.notes || null,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error: {
            message: "Klient s tímto názvem již existuje.",
            code: "DUPLICATE",
          },
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: { message: error.message, code: error.code } },
      { status: 500 },
    );
  }

  // Add creator as admin member
  await supabase.from("client_members").insert({
    client_id: data.id,
    user_id: user.id,
    role: "admin",
  });

  return NextResponse.json({ data }, { status: 201 });
}
