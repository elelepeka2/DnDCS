-- =============================================================================
-- 20261009000001_feat_admin_characters_readonly.sql
-- Adds SELECT-only admin RLS policies to the characters parity set
-- (characters, character_languages, character_equipment, character_inventory)
-- so admins can read any user's character at owner fidelity.
--
-- WHY: admins could only see profiles (20261005000001_feat_admin_profiles.sql)
-- and had zero visibility into users' characters, blocking support and triage.
-- This migration proves REQ-1, REQ-2, REQ-3, REQ-4, REQ-8 and REQ-9 of the
-- admin-character-visibility spec.
--
-- Design notes:
--   - Policy shape byte-matches profiles_select_admin
--     (20261005000001_feat_admin_profiles.sql L188-193): drop-if-exists, then
--     create ... for select to authenticated using ((select private.is_admin())).
--     USING (true) is forbidden by CONVENTIONS.md; private.is_admin() is the
--     SECURITY DEFINER helper introduced by 20261005000001.
--   - create policy has NO `if not exists` in Postgres, so every create MUST be
--     preceded by its `drop policy if exists`; drop-first is what makes re-runs
--     no-ops (REQ-8 idempotency).
--   - Zero statements touch owner policies, GRANTs, or character_proficiencies
--     (REQ-9 rollback safety). SELECT-only: admin insert/update/delete stays
--     rejected by RLS (REQ-4).
--
-- Rollback: drop the four <table>_select_admin policies (no data change;
-- owners are unaffected).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- public.characters: admin read-only SELECT
-- -----------------------------------------------------------------------------

-- Admin: second permissive SELECT, OR-combined with the owner policy
drop policy if exists "characters_select_admin" on public.characters;
create policy "characters_select_admin"
  on public.characters
  for select
  to authenticated
  using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- public.character_languages: admin read-only SELECT
-- -----------------------------------------------------------------------------

-- Admin: second permissive SELECT, OR-combined with the owner policy
drop policy if exists "character_languages_select_admin" on public.character_languages;
create policy "character_languages_select_admin"
  on public.character_languages
  for select
  to authenticated
  using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- public.character_equipment: admin read-only SELECT
-- -----------------------------------------------------------------------------

-- Admin: second permissive SELECT, OR-combined with the owner policy
drop policy if exists "character_equipment_select_admin" on public.character_equipment;
create policy "character_equipment_select_admin"
  on public.character_equipment
  for select
  to authenticated
  using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- public.character_inventory: admin read-only SELECT
-- -----------------------------------------------------------------------------

-- Admin: second permissive SELECT, OR-combined with the owner policy
drop policy if exists "character_inventory_select_admin" on public.character_inventory;
create policy "character_inventory_select_admin"
  on public.character_inventory
  for select
  to authenticated
  using ((select private.is_admin()));
