# Supabase — DnDCS

Este directorio versiona la infraestructura de Supabase del proyecto mediante
migraciones SQL y un seed de datos de catálogo. El objetivo: que cualquier
desarrollador pueda reproducir desde Git el esquema versionado (tablas, RLS,
grants) y el catálogo del proyecto, y que los cambios futuros se hagan mediante
código (migraciones) en lugar de a mano en el dashboard.

> **Alcance actual**: se reproduce el **esquema + RLS/grants versionados +
> catálogo**. Auth, Storage y otros componentes platform-managed NO se
> reproducen todavía (ver "Qué NO se reproduce").

## Estado del versionado

| Fecha | Estado |
|---|---|
| 2026-09-17 | Baseline creado: schema + RLS/grants + seed. Storage pendiente de confirmación. |

## Estructura

```
supabase/
├── config.toml              # Configuración del CLI (project_id = DnDCS)
├── migrations/
│   ├── 20260917000001_initial_schema.sql   # DDL fiel: tablas, columnas, defaults, PK, FK
│   └── 20260917000002_rls_and_grants.sql   # RLS + policies + grants fieles
└── seed.sql                 # Catálogo: classes, subclasses, races, languages
```

## Cómo aplicar

Requisito: `supabase login` + `supabase link --project-ref <ref>` (necesita la
password de Postgres del owner).

```bash
supabase db push      # aplica las migraciones pendientes
supabase db reset     # recrea localmente: migraciones + seed
```

Alternativa sin password: pegar cada archivo de `migrations/` en orden en el
SQL editor del dashboard de Supabase, y luego `seed.sql`.

## Qué reproduce el baseline

- **Schema completo** de las 16 tablas (columnas, defaults, PK, FK) tal como
  está hoy en remoto — **incluidas las inconsistencias existentes** (no se
  corrigió nada).
- **RLS habilitada en las 16 tablas** + las 8 policies existentes.
- **Grants sobre tablas** verificados en el remoto (all a anon, authenticated,
  service_role). Sin grants de sequences ni routines: no había evidencia.
- **Extensiones** `pgcrypto` y `uuid-ossp` (las demás son platform-managed).
- **Seed** con los datos de catálogo reales (13 clases, 48 subclases, 9 razas,
  16 idiomas), capturados de la base remota (read-only) el 2026-09-17.
- **Versión de Postgres** verificada: 17.6.1 (`major_version = 17` en
  `config.toml`).

## Qué NO se reproduce (platform-managed / fuera de alcance)

- Esquema `auth` (FK `characters.user_id → auth.users(id)`: funciona solo en
  Supabase, no se crea).
- Esquemas `storage` / `realtime` y sus triggers/funciones internos.
- Extensiones `pg_stat_statements`, `supabase_vault` (preinstaladas por Supabase).
- Datos de usuarios, personajes u otras tablas de negocio (solo catálogo).

## Pendientes del owner

> Estas observaciones documentan el estado actual SIN decidir nada. Las mejoras
> se harán en migraciones/PRs posteriores, nunca modificando este baseline.

1. **Storage: bucket `character-avatars` pendiente.** La API devuelve 404 para
   el bucket. El frontend (`ProfileTab.jsx`) hace upload ahí, así que los
   avatares probablemente fallan hoy. Falta confirmar: ¿existe? ¿público o
   privado? ¿policies? Cuando se confirme, se creará una migración real de
   storage (no se inventan valores).
2. **`character_languages` con policy "Permitir todo"** (`using (true)` /
   `with check (true)`, rol público): cualquier usuario puede leer/escribir
   idiomas de cualquier personaje.
3. **`characters` sin policy DELETE**: los usuarios no pueden borrar personajes
   (puede ser intencional).
4. **Sin índice en `characters.user_id`** — el frontend filtra por `user_id` en
   cada query.
5. **Columnas legacy vs normalizadas** en `characters`: `raza`/`class_id`/
   `subclass_id` (legacy, usadas por el frontend) conviven con `race_id`/
   `main_class_id`/`main_subclass_id` (normalizadas). Decidir fuente de verdad.
6. **`race_stat_bonuses.race_id` y `race_proficiencies.race_id` son `text` sin
   FK** mientras `races.id` es `uuid` — tablas rotas/inaccesibles (vacías hoy).
7. **`races.name` usa `name`** mientras el resto del catálogo usa `nombre`, y
   guarda bonos/idiomas/competencias en JSONB/arrays mientras existen tablas
   relacionales (`race_stat_bonuses`, `race_proficiencies`) para lo mismo.
8. **10 tablas con RLS habilitada y sin policies** (bloqueadas para
   anon/authenticated): `race_stat_bonuses`, `race_proficiencies`,
   `class_proficiencies`, `class_features`, `equipment_base`, `spells`,
   `class_spells`, `character_proficiencies`, `character_equipment`,
   `character_inventory`. Hoy no rompen nada (vacías/sin uso), pero al
   implementar las pestañas habrá que agregar policies.
9. **`class_proficiencies.opciones_cantidad`** existe pero no hay datos —
   verificar si el frontend lo necesita.
10. **Grants de sequences y routines sin confirmar**: el baseline solo
    reproduce grants de tablas (los únicos verificados). Si la API necesita
    insertar en `class_features` (IDENTITY), habrá que confirmar/agregar
    USAGE sobre su sequence.

## Decisiones tomadas al crear el baseline

- El dump original mostraba `languages ARRAY`/`proficiencies ARRAY` sin tipo en
  `races`; se tiparon como `text[]` (el default `ARRAY[]::text[]` lo confirma).
- Se preservaron los UUID reales y `created_at` de `races` en el seed para
  mantener fidelidad con el estado actual.
- Storage no se incluyó en este baseline: el bucket no está confirmado; se creará
  una migración real cuando el owner lo confirme.
