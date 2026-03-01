import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import {
  CreateJobSchema,
  TechnicalAuditParamsSchema,
  JOB_TYPE_REGISTRY,
} from "@agency-ops/shared";

export async function GET(request: NextRequest) {
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

  const clientId = request.nextUrl.searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json(
      { error: { message: "client_id is required", code: "MISSING_PARAM" } },
      { status: 400 },
    );
  }

  // RLS ensures user can only see jobs for their clients
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, client_id, job_type, status, progress, progress_message, created_at, completed_at, started_at",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

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

  const body = await request.json();

  // Validate top-level structure
  const parsed = CreateJobSchema.safeParse(body);
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

  const { client_id, job_type, params } = parsed.data;

  // Validate job-type-specific params
  if (job_type === "seo.technical-audit") {
    const paramsResult = TechnicalAuditParamsSchema.safeParse(params);
    if (!paramsResult.success) {
      return NextResponse.json(
        {
          error: {
            message:
              paramsResult.error.errors[0]?.message ?? "Neplatné parametry.",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }
  }

  // Verify user has access to this client (RLS will check, but early feedback)
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", client_id)
    .single();

  if (!client) {
    return NextResponse.json(
      { error: { message: "Klient nenalezen.", code: "NOT_FOUND" } },
      { status: 404 },
    );
  }

  // Calculate timeout
  const config = JOB_TYPE_REGISTRY[job_type];
  const timeoutAt = new Date(Date.now() + config.defaultTimeoutMs).toISOString();

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      client_id,
      job_type,
      params: params as Json,
      status: "queued",
      timeout_at: timeoutAt,
      created_by: user.id,
    })
    .select("id, status, created_at")
    .single();

  if (jobError) {
    return NextResponse.json(
      { error: { message: jobError.message, code: jobError.code } },
      { status: 500 },
    );
  }

  // Write audit log
  await supabase.from("audit_log").insert({
    user_id: user.id,
    client_id,
    action: "job.created",
    metadata: { job_id: job.id, job_type },
  });

  return NextResponse.json({ data: job }, { status: 201 });
}
