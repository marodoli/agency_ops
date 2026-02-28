import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
