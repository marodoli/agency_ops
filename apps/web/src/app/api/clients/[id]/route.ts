import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { updateClientSchema } from "@/lib/validations/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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

  // RLS ensures user can only see their own clients
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { message: "Client not found", code: "NOT_FOUND" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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
  const parsed = updateClientSchema.safeParse(body);

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

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.domain !== undefined)
    updates.domain = parsed.data.domain || null;
  if (parsed.data.brandVoice !== undefined)
    updates.brand_voice = parsed.data.brandVoice || null;
  if (parsed.data.notes !== undefined)
    updates.notes = parsed.data.notes || null;
  if (parsed.data.isActive !== undefined)
    updates.is_active = parsed.data.isActive;

  // RLS ensures user can only update clients they have access to
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select("id, name, slug, domain, is_active")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { message: error?.message ?? "Update failed", code: error?.code ?? "UPDATE_FAILED" } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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

  // Soft delete
  const { error } = await supabase
    .from("clients")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: error.code } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { id, deleted: true } });
}
