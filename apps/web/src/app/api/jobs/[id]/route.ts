import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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

  // RLS ensures user can only see jobs for their clients
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { message: "Job not found", code: "NOT_FOUND" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest, context: RouteContext) {
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

  // Check action from body
  const body = await request.json().catch(() => ({}));
  const action = body.action;

  if (action !== "cancel") {
    return NextResponse.json(
      { error: { message: "Unknown action", code: "BAD_REQUEST" } },
      { status: 400 },
    );
  }

  // Fetch job first to verify access and status
  const { data: job } = await supabase
    .from("jobs")
    .select("id, client_id, status")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json(
      { error: { message: "Job not found", code: "NOT_FOUND" } },
      { status: 404 },
    );
  }

  if (job.status !== "queued" && job.status !== "running") {
    return NextResponse.json(
      {
        error: {
          message: `Job nelze zrušit — aktuální stav: ${job.status}`,
          code: "INVALID_STATE",
        },
      },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: { message: updateError.message, code: updateError.code } },
      { status: 500 },
    );
  }

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: user.id,
    client_id: job.client_id,
    action: "job.cancelled",
    metadata: { job_id: id },
  });

  return NextResponse.json({ data: { id, status: "cancelled" } });
}
