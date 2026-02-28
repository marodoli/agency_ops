-- 001_initial_schema.sql
-- Initial database schema for agency_ops
-- Matches docs/libraries.md exactly

-- ── Extensions ─────────────────────────────────────────────

create extension if not exists "uuid-ossp" with schema extensions;

-- ── Profiles ───────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  role        text not null default 'member'
              check (role in ('admin', 'member')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Clients ────────────────────────────────────────────────

create table public.clients (
  id                      uuid primary key default extensions.uuid_generate_v4(),
  name                    text not null,
  domain                  text,
  slug                    text unique not null,
  brand_voice             text,
  notes                   text,
  google_drive_folder_id  text,
  slack_channel_id        text,
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references auth.users(id)
);

alter table public.clients enable row level security;

-- ── Client Members ─────────────────────────────────────────

create table public.client_members (
  id          uuid primary key default extensions.uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member'
              check (role in ('admin', 'member')),
  created_at  timestamptz not null default now(),

  unique (client_id, user_id)
);

alter table public.client_members enable row level security;

-- ── Jobs ───────────────────────────────────────────────────

create table public.jobs (
  id                uuid primary key default extensions.uuid_generate_v4(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  job_type          text not null,
  status            text not null default 'queued'
                    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  params            jsonb not null default '{}',
  progress          integer not null default 0
                    check (progress >= 0 and progress <= 100),
  progress_message  text,
  result            jsonb,
  error             jsonb,
  retry_count       integer not null default 0
                    check (retry_count >= 0),
  started_at        timestamptz,
  completed_at      timestamptz,
  timeout_at        timestamptz,
  created_at        timestamptz not null default now(),
  created_by        uuid not null references auth.users(id)
);

alter table public.jobs enable row level security;

-- Index for worker queue polling
create index idx_jobs_queue on public.jobs (status, created_at)
  where status = 'queued';

-- Index for client job listing
create index idx_jobs_client on public.jobs (client_id, created_at desc);

-- ── Audit Log ──────────────────────────────────────────────

create table public.audit_log (
  id          uuid primary key default extensions.uuid_generate_v4(),
  user_id     uuid references auth.users(id),
  client_id   uuid references public.clients(id) on delete set null,
  action      text not null,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Index for audit log queries
create index idx_audit_log_client on public.audit_log (client_id, created_at desc);

-- ── updated_at trigger ─────────────────────────────────────

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger set_updated_at
  before update on public.clients
  for each row execute function public.update_updated_at();

-- ── RLS Policies ───────────────────────────────────────────

-- profiles: users can read all profiles, update only their own
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid());

-- clients: users see only clients they're a member of
create policy "clients_select" on public.clients
  for select to authenticated
  using (
    exists (
      select 1 from public.client_members
      where client_members.client_id = clients.id
        and client_members.user_id = auth.uid()
    )
  );

create policy "clients_insert" on public.clients
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "clients_update" on public.clients
  for update to authenticated
  using (
    exists (
      select 1 from public.client_members
      where client_members.client_id = clients.id
        and client_members.user_id = auth.uid()
    )
  );

-- client_members: users see their own memberships, admins manage all
create policy "client_members_select" on public.client_members
  for select to authenticated
  using (user_id = auth.uid());

create policy "client_members_admin_select" on public.client_members
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "client_members_admin_insert" on public.client_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "client_members_admin_delete" on public.client_members
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- jobs: users see jobs for clients they're a member of
create policy "jobs_select" on public.jobs
  for select to authenticated
  using (
    exists (
      select 1 from public.client_members
      where client_members.client_id = jobs.client_id
        and client_members.user_id = auth.uid()
    )
  );

create policy "jobs_insert" on public.jobs
  for insert to authenticated
  with check (
    exists (
      select 1 from public.client_members
      where client_members.client_id = jobs.client_id
        and client_members.user_id = auth.uid()
    )
  );

-- audit_log: admins read all, members read logs for their clients
create policy "audit_log_admin_select" on public.audit_log
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "audit_log_member_select" on public.audit_log
  for select to authenticated
  using (
    client_id is not null
    and exists (
      select 1 from public.client_members
      where client_members.client_id = audit_log.client_id
        and client_members.user_id = auth.uid()
    )
  );

-- audit_log: insert allowed for authenticated (system writes via service_role)
create policy "audit_log_insert" on public.audit_log
  for insert to authenticated
  with check (true);

-- ── Realtime ───────────────────────────────────────────────

alter publication supabase_realtime add table public.jobs;
