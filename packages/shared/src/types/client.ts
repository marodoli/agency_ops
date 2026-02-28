import { z } from "zod";

// ── clients table ──────────────────────────────────────────

export const ClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  domain: z.string().nullable(),
  slug: z.string().min(1),
  brand_voice: z.string().nullable(),
  notes: z.string().nullable(),
  google_drive_folder_id: z.string().nullable(),
  slack_channel_id: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid(),
});

export type Client = z.infer<typeof ClientSchema>;

export const CreateClientSchema = ClientSchema.pick({
  name: true,
  domain: true,
  slug: true,
  brand_voice: true,
  notes: true,
});

export type CreateClient = z.infer<typeof CreateClientSchema>;

export const UpdateClientSchema = CreateClientSchema.partial();

export type UpdateClient = z.infer<typeof UpdateClientSchema>;

// ── client_members table ───────────────────────────────────

export const ClientMemberRoleSchema = z.enum(["admin", "member"]);

export type ClientMemberRole = z.infer<typeof ClientMemberRoleSchema>;

export const ClientMemberSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: ClientMemberRoleSchema,
  created_at: z.string().datetime(),
});

export type ClientMember = z.infer<typeof ClientMemberSchema>;

// ── profiles table ─────────────────────────────────────────

export const PlatformRoleSchema = z.enum(["admin", "member"]);

export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  role: PlatformRoleSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;

// ── audit_log table ────────────────────────────────────────

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  client_id: z.string().uuid().nullable(),
  action: z.string().min(1),
  metadata: z.record(z.unknown()),
  created_at: z.string().datetime(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
