-- =============================================================================
-- 0002_rls_and_grants.sql
-- RLS + policies + grants, fieles al estado actual (2026-09-17).
-- RLS está habilitada en TODAS las tablas. Solo 6 tablas tienen policies.
-- Las 10 tablas sin policy quedan bloqueadas para anon/authenticated.
-- Los agujeros conocidos se reproducen fielmente y se documentan en README.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Habilitar RLS en todas las tablas (estado actual: true en las 16)
-- -----------------------------------------------------------------------------
alter table public.classes               enable row level security;
alter table public.subclasses            enable row level security;
alter table public.race_stat_bonuses     enable row level security;
alter table public.class_proficiencies   enable row level security;
alter table public.race_proficiencies    enable row level security;
alter table public.class_features        enable row level security;
alter table public.equipment_base        enable row level security;
alter table public.spells                enable row level security;
alter table public.class_spells          enable row level security;
alter table public.characters            enable row level security;
alter table public.character_languages   enable row level security;
alter table public.character_proficiencies enable row level security;
alter table public.character_equipment   enable row level security;
alter table public.character_inventory   enable row level security;
alter table public.races                 enable row level security;
alter table public.languages             enable row level security;

-- -----------------------------------------------------------------------------
-- Policies de characters (rol {public} en el estado actual)
-- -----------------------------------------------------------------------------
create policy "Users can insert their own characters"
  on public.characters
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own characters"
  on public.characters
  for update
  using (auth.uid() = user_id);

create policy "Users can view their own characters"
  on public.characters
  for select
  using (auth.uid() = user_id);

-- NOTA: NO existe policy DELETE en el estado actual -> los usuarios no pueden
-- borrar personajes. Reproducido fielmente.

-- -----------------------------------------------------------------------------
-- Policy de character_languages: "Permitir todo" (agujero conocido, fiel)
-- -----------------------------------------------------------------------------
create policy "Permitir todo en character_languages"
  on public.character_languages
  for all
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- Policies de lectura pública del catálogo
-- -----------------------------------------------------------------------------
create policy "Permitir lectura de clases a todos"
  on public.classes
  for select
  using (true);

create policy "Permitir lectura publica de languages"
  on public.languages
  for select
  using (true);

create policy "Permitir lectura pública de razas"
  on public.races
  for select
  using (true);

create policy "Permitir lectura de subclases a todos"
  on public.subclasses
  for select
  using (true);

-- -----------------------------------------------------------------------------
-- Grants (verificados en el estado remoto el 2026-09-17).
-- El dump de grants confirmó privilegios ALL sobre las TABLAS para anon,
-- authenticated y service_role (postgres es el owner y no necesita grants).
-- NO se incluyen grants de sequences ni de routines: no hay evidencia de que
-- existan en el remoto (el dump solo cubría role_table_grants).
-- Pendiente del owner: confirmar si hace falta USAGE sobre la sequence de
-- class_features (GENERATED ALWAYS AS IDENTITY) para inserts por API.
-- -----------------------------------------------------------------------------
grant all on all tables in schema public to anon, authenticated, service_role;
