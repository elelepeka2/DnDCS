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

## Runbook: roles admin y cuentas (admin-profiles)

La migración `20261005000001_feat_admin_profiles.sql` crea `public.profiles`
(role `player` | `admin`), el helper `private.is_admin()`, las policies RLS y
un UPDATE de bootstrap que promueve a **un UUID fijo** a admin. Ese UPDATE es
idempotente: si el UUID no existe en el entorno (staging, fork, otro proyecto)
no falla, simplemente actualiza 0 filas — y la promoción se hace a mano con el
SQL de abajo.

### 1. Promover un admin (entornos con UUID desconocido)

Pegar en el SQL editor del dashboard (o en `supabase db push` + cliente psql):

```sql
-- (opcional) localizar el user_id del usuario a promover
select id, email, created_at from auth.users order by created_at desc;

-- promover (idempotente: re-ejecutar no cambia nada ni falla)
update public.profiles set role = 'admin'
 where user_id = '<USER_ID_UUID>'
   and role is distinct from 'admin';
```

Si el usuario aún no tiene fila en `public.profiles` (nunca inició sesión
desde que existe la tabla), crearla primero:

```sql
insert into public.profiles (user_id, username)
select id, coalesce(nullif(raw_user_meta_data ->> 'username', ''),
                    split_part(email, '@', 1))
from auth.users where id = '<USER_ID_UUID>'
on conflict (user_id) do nothing;
```

### 2. Recuperación del último admin

No hay policy DELETE ni auto-asignación de roles desde el cliente: un admin
que se baja a `player` solo puede ser rescatado desde el servidor. Desde el
SQL editor con el rol `postgres`/`service_role`:

```sql
update public.profiles set role = 'admin'
 where user_id = '<USER_ID_UUID>'
   and role is distinct from 'admin';
```

Regla operativa: mantener siempre **al menos un segundo admin** antes de
auto-bajar a cualquiera, o dejar este runbook a mano.

### 3. Desbanear un usuario (dashboard)

El baneo se hace con la Edge Function `admin-ban-user`; **no existe función
de unban** (fuera de alcance). Para reversarlo:

1. Supabase Dashboard → **Authentication → Users**.
2. Seleccionar el usuario baneado.
3. Acción **UNBAN** (o quitar el flag de ban) y guardar.
4. El usuario ya puede iniciar sesión de nuevo con su contraseña actual.

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
8. **10 tablas con RLS habilitada y sin policies** — **Resuelto para las
   tablas de las pestañas (2026-09-28)**: `character_inventory` y
   `character_equipment` ahora tienen 4 policies owner-scoped cada una
   (SELECT/INSERT/UPDATE/DELETE) más un índice btree sobre `character_id`,
   en `20260928000001_feat_character_inventory_equipment_rls.sql`.
   Quedan 8 tablas de catálogo todavía bloqueadas para
   anon/authenticated (vacías/sin uso, fuera de alcance de las pestañas):
   `race_stat_bonuses`, `race_proficiencies`, `class_proficiencies`,
   `class_features`, `equipment_base`, `spells`, `class_spells`,
   `character_proficiencies`.
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
