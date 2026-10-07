-- =============================================================================
-- 20261005000001_feat_admin_profiles.sql
-- Adds the profiles table with player/admin roles, the non-exposed private
-- schema helpers, the auth-user seeding trigger (+ backfill), owner/admin RLS
-- policies, and an idempotent first-admin bootstrap.
--
-- Design notes:
--   - private.is_admin() is SECURITY DEFINER with search_path pinned so RLS
--     policies can read public.profiles without re-entering the profiles
--     policy (no 42P17 recursion).
--   - EXECUTE on private.is_admin() is revoked from PUBLIC/anon/service_role
--     and GRANTED to authenticated: policy expressions run as the querying
--     role, so authenticated MUST keep EXECUTE (otherwise 42501 on every
--     profiles query).
--   - Every statement is idempotent: re-applying this file is a no-op.
--
-- Rollback (follow-up migration): drop trigger on_auth_user_created;
-- drop table public.profiles; drop schema private cascade.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- private schema: never routed by PostgREST ([api].schemas = public,graphql_public)
-- -----------------------------------------------------------------------------

create schema if not exists private;

-- -----------------------------------------------------------------------------
-- profiles table (spec: profiles shape / DDL)
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique,
  role       text not null default 'player' check (role in ('player', 'admin')),
  bio        text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Directory reads are ordered by created_at desc (server pagination).
create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

alter table public.profiles enable row level security;

-- -----------------------------------------------------------------------------
-- private.handle_new_user(): seed a profiles row on every auth.users insert.
-- SECURITY DEFINER because GoTrue inserts auth.users as supabase_auth_admin,
-- which holds no grant on public.profiles. search_path pinned to '' so no
-- object shadowing is possible.
-- -----------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'user_' || left(new.id::text, 8)
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
revoke execute on function private.handle_new_user()
  from anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Backfill: users created BEFORE this trigger exist in auth.users with no
-- profiles row. Runs in the SAME transaction as the trigger creation, so
-- there is no window where a signup lands without a row.
-- Dedup: row_number() over lower(base) => first keeps the plain username,
-- later collisions get an 8-char id suffix (username is UNIQUE).
-- -----------------------------------------------------------------------------

with cand as (
  select
    u.id,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'username', ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'user'
    ) as base,
    u.created_at
  from auth.users u
),
dedup as (
  select
    id,
    case
      when row_number() over (partition by lower(base) order by created_at, id) = 1
        then base
      else base || '_' || left(id::text, 8)
    end as username
  from cand
)
insert into public.profiles (user_id, username)
select id, username
from dedup
on conflict (user_id) do nothing;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- private.is_admin(): the RLS role check (design decision 2).
-- SECURITY DEFINER (owner is postgres -> bypasses RLS on public.profiles,
-- breaking the profiles-on-profiles recursion), sql + stable + search_path ''.
--
-- GRANT SEQUENCE MATTERS (spec: hardened private.is_admin()):
--   revoke from public, anon, service_role  => anon cannot invoke it
--     (also no EXECUTE, no schema USAGE, schema not routed by PostgREST);
--   GRANT to authenticated                 => REQUIRED: policies execute as
--     the querying role. Revoking from authenticated breaks every profiles
--     query with 42501 permission denied for function is_admin.
-- Readback matrix: anon=f, authenticated=t, PUBLIC=f.
-- -----------------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

revoke execute on function private.is_admin() from public, anon, service_role;
grant execute on function private.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- RLS policies on public.profiles.
-- Permissive policies OR-combine: owner policies + admin second policies.
-- Restrictive policies AND-combine: the role guard closes self-promotion
-- (an owner policy alone would let any player set role='admin' on their own
-- row, because USING/WITH CHECK only pin user_id).
-- NO DELETE policy: client-side deletes are impossible; deletion only via
-- the admin Edge Function (service role).
-- All policies are idempotent: drop if exists + create.
-- -----------------------------------------------------------------------------

-- Owner: read own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Owner: insert own row
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Owner: update own row (USING + WITH CHECK)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Admin: second permissive SELECT, OR-combined with the owner policy
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using ((select private.is_admin()));

-- Admin: second permissive UPDATE, OR-combined (USING + WITH CHECK)
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Restrictive INSERT guard: nobody can insert an admin row unless they are one
drop policy if exists "profiles_insert_role_guard" on public.profiles;
create policy "profiles_insert_role_guard"
  on public.profiles
  as restrictive
  for insert
  to authenticated
  with check (role = 'player' or (select private.is_admin()));

-- Restrictive UPDATE guard: closes the self-promotion hole
drop policy if exists "profiles_update_role_guard" on public.profiles;
create policy "profiles_update_role_guard"
  on public.profiles
  as restrictive
  for update
  to authenticated
  using (role = 'player' or (select private.is_admin()))
  with check (role = 'player' or (select private.is_admin()));

-- NO DELETE policy on purpose (see above).

-- -----------------------------------------------------------------------------
-- Table grants: anon gets nothing, authenticated gets read/write but never
-- DELETE. service_role keeps the default wide grant (server-side only).
-- All grant/revoke statements are idempotent.
-- -----------------------------------------------------------------------------

revoke all on table public.profiles from anon;
revoke delete on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- First-admin bootstrap: exact UUID from the proposal dependency. Re-running
-- the migration is a no-op (role is already 'admin' -> 0 rows updated).
-- Unknown-UUID environments apply this as a no-op and promote via the
-- supabase/README.md runbook.
-- -----------------------------------------------------------------------------

update public.profiles
set role = 'admin'
where user_id = '3325d507-80f0-44c4-b8b9-61ff4bfbdb3f'
  and role is distinct from 'admin';
