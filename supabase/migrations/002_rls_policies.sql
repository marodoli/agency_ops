-- 002_rls_policies.sql
-- Replace initial RLS policies with complete, tested policies.
-- Drops all policies from 001 and recreates with proper rules.
--
-- Roles:
--   admin  = profiles.role = 'admin' (platform-level)
--   member = default, sees only assigned clients via client_members

-- ═══════════════════════════════════════════════════════════
-- DROP existing policies from 001
-- ═══════════════════════════════════════════════════════════

drop policy if exists "profiles_select"              on public.profiles;
drop policy if exists "profiles_update_own"          on public.profiles;

drop policy if exists "clients_select"               on public.clients;
drop policy if exists "clients_insert"               on public.clients;
drop policy if exists "clients_update"               on public.clients;

drop policy if exists "client_members_select"        on public.client_members;
drop policy if exists "client_members_admin_select"  on public.client_members;
drop policy if exists "client_members_admin_insert"  on public.client_members;
drop policy if exists "client_members_admin_delete"  on public.client_members;

drop policy if exists "jobs_select"                  on public.jobs;
drop policy if exists "jobs_insert"                  on public.jobs;

drop policy if exists "audit_log_admin_select"       on public.audit_log;
drop policy if exists "audit_log_member_select"      on public.audit_log;
drop policy if exists "audit_log_insert"             on public.audit_log;

-- ═══════════════════════════════════════════════════════════
-- Helper: reusable check for platform admin
-- ═══════════════════════════════════════════════════════════

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Helper: check membership in a client
create or replace function public.is_member_of(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.client_members
    where client_id = p_client_id
      and user_id = auth.uid()
  );
$$;

-- ═══════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════

-- SELECT: users read own profile; admins read all
-- ✅ PASS: member Alice reads her own profile
-- ✅ PASS: admin Bob reads any user's profile
-- ❌ BLOCK: member Alice reads member Carol's profile
create policy "profiles: read own or admin reads all"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- UPDATE: users update only their own profile
-- ✅ PASS: Alice updates her own full_name
-- ❌ BLOCK: Alice updates Bob's avatar_url
-- ❌ BLOCK: admin Bob updates Alice's role (must use service_role for that)
create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- INSERT/DELETE: handled by trigger (handle_new_user) and cascade.
-- No direct insert/delete policies for authenticated users.

-- ═══════════════════════════════════════════════════════════
-- CLIENTS
-- ═══════════════════════════════════════════════════════════

-- SELECT: members see assigned clients; admins see all
-- ✅ PASS: member Alice assigned to "ClientX" sees ClientX
-- ✅ PASS: admin Bob sees all clients including unassigned ones
-- ❌ BLOCK: member Alice sees "ClientY" she's not assigned to
create policy "clients: read as member or admin"
  on public.clients for select to authenticated
  using (public.is_member_of(id) or public.is_admin());

-- INSERT: admins only
-- ✅ PASS: admin creates new client "ClientZ"
-- ❌ BLOCK: member Alice creates a client
create policy "clients: admin insert"
  on public.clients for insert to authenticated
  with check (public.is_admin());

-- UPDATE: admins can update any; members can update their assigned clients
-- ✅ PASS: admin updates any client's domain
-- ✅ PASS: member Alice updates "ClientX" she's assigned to (e.g. notes)
-- ❌ BLOCK: member Alice updates "ClientY" she's not assigned to
create policy "clients: update as member or admin"
  on public.clients for update to authenticated
  using (public.is_member_of(id) or public.is_admin());

-- DELETE: admins only (soft delete via is_active, but policy guards hard delete)
-- ✅ PASS: admin deletes a client
-- ❌ BLOCK: member deletes a client
create policy "clients: admin delete"
  on public.clients for delete to authenticated
  using (public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- CLIENT_MEMBERS
-- ═══════════════════════════════════════════════════════════

-- SELECT: users see own memberships; admins see all
-- ✅ PASS: member Alice sees her membership in ClientX
-- ✅ PASS: admin Bob sees all memberships across all clients
-- ❌ BLOCK: member Alice sees Carol's membership in ClientY
create policy "client_members: read own or admin"
  on public.client_members for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- INSERT: admins only
-- ✅ PASS: admin adds member Carol to ClientX
-- ❌ BLOCK: member Alice adds herself to ClientY
create policy "client_members: admin insert"
  on public.client_members for insert to authenticated
  with check (public.is_admin());

-- UPDATE: admins only (e.g. change role from member to admin)
-- ✅ PASS: admin changes Alice's role on ClientX to 'admin'
-- ❌ BLOCK: member Alice promotes herself
create policy "client_members: admin update"
  on public.client_members for update to authenticated
  using (public.is_admin());

-- DELETE: admins only
-- ✅ PASS: admin removes Carol from ClientX
-- ❌ BLOCK: member Alice removes herself or others
create policy "client_members: admin delete"
  on public.client_members for delete to authenticated
  using (public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- JOBS
-- ═══════════════════════════════════════════════════════════

-- SELECT: members of the job's client can see it
-- ✅ PASS: member Alice (assigned to ClientX) sees ClientX jobs
-- ✅ PASS: admin Bob sees any job
-- ❌ BLOCK: member Alice sees jobs for ClientY she's not assigned to
create policy "jobs: read as member or admin"
  on public.jobs for select to authenticated
  using (public.is_member_of(client_id) or public.is_admin());

-- INSERT: any member of the client can create a job
-- ✅ PASS: member Alice creates a job for ClientX (she's assigned)
-- ❌ BLOCK: member Alice creates a job for ClientY (not assigned)
create policy "jobs: insert as member"
  on public.jobs for insert to authenticated
  with check (public.is_member_of(client_id));

-- UPDATE: admin or the job creator can update (cancel, etc.)
-- ✅ PASS: Alice (creator) cancels her own job
-- ✅ PASS: admin Bob cancels any job
-- ❌ BLOCK: member Carol (not creator) cancels Alice's job
-- NOTE: worker updates (progress, result) use service_role which bypasses RLS
create policy "jobs: update as creator or admin"
  on public.jobs for update to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- DELETE: no one deletes jobs (history is immutable)
-- Jobs are never deleted, only cancelled via status update.

-- ═══════════════════════════════════════════════════════════
-- AUDIT_LOG
-- ═══════════════════════════════════════════════════════════

-- SELECT: admins read all; members read logs for their clients
-- ✅ PASS: admin reads all audit entries
-- ✅ PASS: member Alice reads audit entries for ClientX (assigned)
-- ❌ BLOCK: member Alice reads audit entries for ClientY (not assigned)
-- ❌ BLOCK: member Alice reads system-level entries (client_id is null)
create policy "audit_log: admin read all"
  on public.audit_log for select to authenticated
  using (public.is_admin());

create policy "audit_log: member read own client"
  on public.audit_log for select to authenticated
  using (
    client_id is not null
    and public.is_member_of(client_id)
  );

-- INSERT: authenticated users can insert (app code writes audit entries)
-- Worker uses service_role which bypasses RLS anyway.
-- ✅ PASS: any authenticated user/code path can write an audit entry
create policy "audit_log: insert"
  on public.audit_log for insert to authenticated
  with check (true);

-- UPDATE/DELETE: nobody. Audit log is append-only / immutable.
-- No policies = no access. RLS blocks all updates and deletes.
-- ❌ BLOCK: anyone trying to UPDATE or DELETE audit_log rows
