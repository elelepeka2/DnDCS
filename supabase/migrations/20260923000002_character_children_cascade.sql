-- =============================================================================
-- 0004_character_children_cascade.sql
-- Permite borrar un personaje aunque tenga datos hijos.
--
-- Contexto: la migracion 0003 habilito la policy DELETE de characters (el
-- owner puede borrar sus personajes), pero el borrado fisico fallaba con
-- error 23503 porque las 4 tablas hijas tenian FK sin ON DELETE CASCADE.
--
-- Este cambio recrea esas FKs con ON DELETE CASCADE: borrar un personaje
-- elimina en cascada sus idiomas, proficiencias, equipo e inventario.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- character_languages
-- -----------------------------------------------------------------------------
alter table public.character_languages
  drop constraint character_languages_character_id_fkey;

alter table public.character_languages
  add constraint character_languages_character_id_fkey
  foreign key (character_id) references public.characters (id)
  on delete cascade;

-- -----------------------------------------------------------------------------
-- character_proficiencies
-- -----------------------------------------------------------------------------
alter table public.character_proficiencies
  drop constraint character_proficiencies_character_id_fkey;

alter table public.character_proficiencies
  add constraint character_proficiencies_character_id_fkey
  foreign key (character_id) references public.characters (id)
  on delete cascade;

-- -----------------------------------------------------------------------------
-- character_equipment
-- -----------------------------------------------------------------------------
alter table public.character_equipment
  drop constraint character_equipment_character_id_fkey;

alter table public.character_equipment
  add constraint character_equipment_character_id_fkey
  foreign key (character_id) references public.characters (id)
  on delete cascade;

-- -----------------------------------------------------------------------------
-- character_inventory
-- -----------------------------------------------------------------------------
alter table public.character_inventory
  drop constraint character_inventory_character_id_fkey;

alter table public.character_inventory
  add constraint character_inventory_character_id_fkey
  foreign key (character_id) references public.characters (id)
  on delete cascade;