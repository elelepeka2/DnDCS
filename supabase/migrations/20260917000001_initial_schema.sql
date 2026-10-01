-- =============================================================================
-- 0001_initial_schema.sql
-- Baseline fiel del estado actual de la base de datos (2026-09-17).
-- Reproduce el esquema EXACTAMENTE como estaba, incluidas las inconsistencias
-- existentes (columnas legacy, FK ausentes). NO corrige nada.
-- Los pendientes de diseño están documentados en supabase/README.md.
-- =============================================================================

-- Extensiones. pgcrypto y uuid-ossp son necesarias para gen_random_uuid().
-- pg_stat_statements y supabase_vault son platform-managed (preinstaladas por
-- Supabase) y NO se crean aquí.
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- classes
-- -----------------------------------------------------------------------------
create table public.classes (
  id text not null,
  nombre text not null,
  hit_dice text,
  primary_ability text,
  constraint classes_pkey primary key (id)
);

-- -----------------------------------------------------------------------------
-- subclasses
-- -----------------------------------------------------------------------------
create table public.subclasses (
  id text not null,
  class_id text not null,
  nombre text not null,
  descripcion text,
  constraint subclasses_pkey primary key (id),
  constraint subclasses_class_id_fkey foreign key (class_id) references public.classes (id)
);

-- -----------------------------------------------------------------------------
-- race_stat_bonuses
-- NOTA: race_id es text y NO tiene FK a races (races.id es uuid). Estado actual
-- roto reproducido fielmente. Pendiente del owner.
-- -----------------------------------------------------------------------------
create table public.race_stat_bonuses (
  race_id text not null,
  stat text not null,
  bonus integer not null,
  constraint race_stat_bonuses_pkey primary key (race_id, stat)
);

-- -----------------------------------------------------------------------------
-- class_proficiencies
-- -----------------------------------------------------------------------------
create table public.class_proficiencies (
  class_id text not null,
  tipo text not null,
  nombre text not null,
  opciones_cantidad integer,
  constraint class_proficiencies_pkey primary key (class_id, tipo, nombre),
  constraint class_proficiencies_class_id_fkey foreign key (class_id) references public.classes (id)
);

-- -----------------------------------------------------------------------------
-- race_proficiencies
-- NOTA: race_id es text y NO tiene FK (igual que race_stat_bonuses).
-- -----------------------------------------------------------------------------
create table public.race_proficiencies (
  race_id text not null,
  tipo text not null,
  nombre text not null,
  constraint race_proficiencies_pkey primary key (race_id, tipo, nombre)
);

-- -----------------------------------------------------------------------------
-- class_features
-- -----------------------------------------------------------------------------
create table public.class_features (
  id bigint generated always as identity not null,
  class_id text not null,
  subclass_id text,
  level integer not null,
  nombre text not null,
  descripcion text,
  constraint class_features_pkey primary key (id),
  constraint class_features_class_id_fkey foreign key (class_id) references public.classes (id),
  constraint class_features_subclass_id_fkey foreign key (subclass_id) references public.subclasses (id)
);

-- -----------------------------------------------------------------------------
-- equipment_base
-- -----------------------------------------------------------------------------
create table public.equipment_base (
  id text not null,
  nombre text not null,
  categoria text not null,
  propiedades jsonb,
  constraint equipment_base_pkey primary key (id)
);

-- -----------------------------------------------------------------------------
-- spells
-- -----------------------------------------------------------------------------
create table public.spells (
  id text not null,
  nombre text not null,
  level integer not null default 0,
  escuela text,
  tiempo_casteo text,
  alcance text,
  duracion text,
  descripcion text,
  constraint spells_pkey primary key (id)
);

-- -----------------------------------------------------------------------------
-- class_spells
-- -----------------------------------------------------------------------------
create table public.class_spells (
  class_id text not null,
  spell_id text not null,
  constraint class_spells_pkey primary key (class_id, spell_id),
  constraint class_spells_class_id_fkey foreign key (class_id) references public.classes (id),
  constraint class_spells_spell_id_fkey foreign key (spell_id) references public.spells (id)
);

-- -----------------------------------------------------------------------------
-- characters
-- -----------------------------------------------------------------------------
create table public.characters (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  nombre text not null,
  edad integer,
  avatar_url text,
  race_id text,
  main_class_id text,
  main_subclass_id text,
  multiclass_id text,
  multiclass_subclass_id text,
  dinero_po integer default 0,
  dinero_pa integer default 0,
  dinero_pc integer default 0,
  dinero_ppt integer default 0,
  fuerza_base integer default 10,
  destreza_base integer default 10,
  constitucion_base integer default 10,
  inteligencia_base integer default 10,
  sabiduria_base integer default 10,
  carisma_base integer default 10,
  fuerza_asi integer default 0,
  destreza_asi integer default 0,
  constitucion_asi integer default 0,
  inteligencia_asi integer default 0,
  sabiduria_asi integer default 0,
  carisma_asi integer default 0,
  nivel integer default 1,
  experiencia integer default 0,
  hp_max integer default 10,
  hp_actual integer default 10,
  hp_temporal integer default 0,
  ca_bonus integer default 0,
  iniciativa_bonus integer default 0,
  velocidad_override integer,
  historia text,
  personalidad text,
  ideales text,
  vinculos text,
  defectos text,
  created_at timestamp with time zone default now(),
  raza text,
  class_id text,
  subclass_id text,
  iniciativa integer default 0,
  ca integer default 10,
  velocidad integer default 30,
  constraint characters_pkey primary key (id),
  constraint characters_user_id_fkey foreign key (user_id) references auth.users (id),
  constraint characters_main_class_id_fkey foreign key (main_class_id) references public.classes (id),
  constraint characters_main_subclass_id_fkey foreign key (main_subclass_id) references public.subclasses (id),
  constraint characters_multiclass_id_fkey foreign key (multiclass_id) references public.classes (id),
  constraint characters_multiclass_subclass_id_fkey foreign key (multiclass_subclass_id) references public.subclasses (id),
  constraint characters_class_id_fkey foreign key (class_id) references public.classes (id),
  constraint characters_subclass_id_fkey foreign key (subclass_id) references public.subclasses (id)
);

-- -----------------------------------------------------------------------------
-- character_languages
-- -----------------------------------------------------------------------------
create table public.character_languages (
  character_id uuid not null,
  idioma text not null,
  constraint character_languages_pkey primary key (character_id, idioma),
  constraint character_languages_character_id_fkey foreign key (character_id) references public.characters (id)
);

-- -----------------------------------------------------------------------------
-- character_proficiencies
-- -----------------------------------------------------------------------------
create table public.character_proficiencies (
  character_id uuid not null,
  tipo text not null,
  nombre text not null,
  es_experto boolean default false,
  constraint character_proficiencies_pkey primary key (character_id, tipo, nombre),
  constraint character_proficiencies_character_id_fkey foreign key (character_id) references public.characters (id)
);

-- -----------------------------------------------------------------------------
-- character_equipment
-- -----------------------------------------------------------------------------
create table public.character_equipment (
  id uuid not null default gen_random_uuid(),
  character_id uuid,
  slot text not null,
  equipment_base_id text,
  nombre_objeto text not null,
  efecto text,
  constraint character_equipment_pkey primary key (id),
  constraint character_equipment_character_id_fkey foreign key (character_id) references public.characters (id),
  constraint character_equipment_equipment_base_id_fkey foreign key (equipment_base_id) references public.equipment_base (id)
);

-- -----------------------------------------------------------------------------
-- character_inventory
-- -----------------------------------------------------------------------------
create table public.character_inventory (
  id uuid not null default gen_random_uuid(),
  character_id uuid,
  nombre text not null,
  cantidad integer default 1,
  tipo_objeto text not null default 'comun'::text,
  descripcion text,
  requiere_sintonizacion boolean default false,
  constraint character_inventory_pkey primary key (id),
  constraint character_inventory_character_id_fkey foreign key (character_id) references public.characters (id)
);

-- -----------------------------------------------------------------------------
-- races
-- NOTA: las columnas languages/proficiencies se tipan como text[] (el dump
-- original mostraba "ARRAY" sin tipo; el default ARRAY[]::text[] confirma text[]).
-- -----------------------------------------------------------------------------
create table public.races (
  id uuid not null default gen_random_uuid(),
  name text not null unique,
  ability_score_bonuses jsonb not null default '{}'::jsonb,
  speed integer default 30,
  languages text[] default array[]::text[],
  proficiencies text[] default array[]::text[],
  traits jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  constraint races_pkey primary key (id)
);

-- -----------------------------------------------------------------------------
-- languages
-- -----------------------------------------------------------------------------
create table public.languages (
  id text not null,
  nombre text not null,
  constraint languages_pkey primary key (id)
);
