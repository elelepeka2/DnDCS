-- =============================================================================
-- 20261008000001_fix_characters_user_fk_cascade.sql
-- Fix: deleting an auth user must remove their characters too.
--
-- WHY: GoTrue's deleteUser (used by the admin-delete-user Edge Function)
-- deletes the auth.users row, but characters_user_id_fkey was created with
-- NO ACTION (20260917000001_initial_schema.sql:176). Any user owning
-- characters therefore failed with SQLSTATE 23503 and HTTP 500
-- "Database error deleting user"; the account, profile and character rows
-- all survived. The S1 admin-profiles migration only cascades profiles.
--
-- The four children of characters (character_languages,
-- character_proficiencies, character_equipment, character_inventory) already
-- use ON DELETE CASCADE (20260923000002_character_children_cascade.sql),
-- so they follow automatically once characters cascades from auth.users.
--
-- Idempotent: drop-if-exists + re-add; re-running is a no-op.
-- =============================================================================

alter table public.characters
  drop constraint if exists characters_user_id_fkey;

alter table public.characters
  add constraint characters_user_id_fkey
    foreign key (user_id) references auth.users (id)
    on delete cascade;
