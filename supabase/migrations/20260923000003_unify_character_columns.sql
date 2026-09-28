-- =============================================================================
-- 0005_unify_character_columns.sql
-- Unifica las columnas duplicadas de characters y repara las FKs de raza.
--
-- Decide las columnas canonicas:
--   Raza        -> race_id uuid (FK a races.id). Se elimina raza (text).
--   Clase       -> class_id (FK a classes). Se eliminan main_class_id y
--                  main_subclass_id (ClassTab ya usaba class_id/subclass_id).
--   Multiclase  -> multiclass_id / multiclass_subclass_id (sin cambios).
--   CA          -> ca (default 10). Se elimina ca_bonus.
--   Iniciativa  -> iniciativa (default 0). Se elimina iniciativa_bonus.
--   Velocidad   -> velocidad (default 30). Se elimina velocidad_override.
--
-- Ademas repara race_stat_bonuses y race_proficiencies: race_id pasa de
-- text a uuid con FK real a races(id), y se pueblan desde los datos ya
-- existentes en races (ability_score_bonuses / proficiencies).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. characters: race_id text -> uuid con FK real
-- -----------------------------------------------------------------------------
alter table public.characters
  alter column race_id drop default;

alter table public.characters
  alter column race_id type uuid
  using race_id::uuid;

alter table public.characters
  add constraint characters_race_id_fkey
  foreign key (race_id) references public.races (id);

-- -----------------------------------------------------------------------------
-- 2. characters: eliminar columnas duplicadas (drop column quita sus FKs solas)
-- -----------------------------------------------------------------------------
alter table public.characters
  drop column raza,
  drop column main_class_id,
  drop column main_subclass_id,
  drop column ca_bonus,
  drop column iniciativa_bonus,
  drop column velocidad_override;

-- -----------------------------------------------------------------------------
-- 3. race_stat_bonuses: race_id text -> uuid con FK
-- -----------------------------------------------------------------------------
alter table public.race_stat_bonuses
  alter column race_id type uuid
  using race_id::uuid;

alter table public.race_stat_bonuses
  add constraint race_stat_bonuses_race_id_fkey
  foreign key (race_id) references public.races (id);

-- Poblar desde races.ability_score_bonuses (datos ya existentes, sin inventar).
-- 'eleccion_libre' no es un stat real (Semielfo) -> se excluye.
insert into public.race_stat_bonuses (race_id, stat, bonus)
select r.id, b.key, (b.value)::int
from public.races r
cross join lateral jsonb_each_text(r.ability_score_bonuses) as b(key, value)
where b.key <> 'eleccion_libre'
on conflict (race_id, stat) do nothing;

-- -----------------------------------------------------------------------------
-- 4. race_proficiencies: race_id text -> uuid con FK
-- -----------------------------------------------------------------------------
alter table public.race_proficiencies
  alter column race_id type uuid
  using race_id::uuid;

alter table public.race_proficiencies
  add constraint race_proficiencies_race_id_fkey
  foreign key (race_id) references public.races (id);

-- Poblar desde races.proficiencies (datos ya existentes).
insert into public.race_proficiencies (race_id, tipo, nombre)
select r.id, 'competencia', p
from public.races r
cross join lateral unnest(r.proficiencies) as p
on conflict (race_id, tipo, nombre) do nothing;