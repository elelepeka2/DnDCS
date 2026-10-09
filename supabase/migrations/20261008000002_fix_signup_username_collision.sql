-- =============================================================================
-- 20261008000002_fix_signup_username_collision.sql
-- Review correction R3-SIGNUP-USERNAME-COLLISION.
--
-- WHY: private.handle_new_user() (20261005000001) derives the profile username
-- from user_metadata.username or the email local part and inserts with only
-- `on conflict (user_id) do nothing`. public.profiles.username is NOT NULL
-- UNIQUE, so a derived name that already exists raises unique_violation in the
-- AFTER INSERT trigger and the whole auth.users insert rolls back: registration
-- fails outright. The rename flow added by the same feature makes this
-- reachable — a user may claim any name not yet taken by an email local part,
-- and a later signup claiming that name cannot complete.
--
-- FIX: resolve collisions inside the trigger with a numeric suffix loop plus
-- one retry if concurrent signups race. Applied migration 20261005000001 is
-- never edited (CONVENTIONS.md). Idempotent: create or replace only.
-- =============================================================================

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  base      text;
  candidate text;
  suffix    integer := 1;
begin
  base := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'user_' || left(new.id::text, 8)
  );

  -- Case-insensitive probe: names differing only by case would read as
  -- duplicates in the directory even though UNIQUE itself is case-sensitive.
  candidate := base;
  while exists (select 1 from public.profiles p where lower(p.username) = lower(candidate)) loop
    suffix    := suffix + 1;
    candidate := base || '_' || suffix;
  end loop;

  begin
    insert into public.profiles (user_id, username)
    values (new.id, candidate) on conflict (user_id) do nothing;
  exception
    when unique_violation then -- concurrent signup won the race
      candidate := base || '_' || floor(random() * 9000 + 1000)::text;
      insert into public.profiles (user_id, username)
      values (new.id, candidate) on conflict (user_id) do nothing;
  end;

  return new;
end;
$$;
