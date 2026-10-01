# Convenciones de Git para DnDCS

## Branches

| Branch | Uso | Notas |
|---|---|---|
| `main` | Producción estable | Nunca push directo; solo merges desde `develop` o hotfixes |
| `develop` | Desarrollo principal | Acumula features completas y testeadas |
| `feature/<nombre>` | Nueva funcionalidad | Se crea desde `develop` y se mergea a `develop` al terminar |
| `bugfix/<nombre>` | Corrección de errores | Se crea desde `develop` (o desde `main` si es hotfix crítico) |
| `hotfix/<nombre>` | Corrección urgente en producción | Se crea desde `main` y se mergea a `main` y `develop` |
| `release/<version>` | Preparación de release | Se crea desde `develop`; permite ajustes menores y testing |

Ejemplos:

- `feature/character-creation`
- `bugfix/fix-rls-policy`
- `hotfix/fix-supabase-env`
- `release/v1.2.0`

## Convenciones de commits

Conventional Commits:

```
<tipo>(<área>): <descripción corta>

[body opcional]

[footer opcional]
```

Tipos permitidos:

| Tipo | Descripción | Ejemplo |
|---|---|---|
| `feat` | Nueva funcionalidad | `feat(auth): agregar login con Supabase` |
| `fix` | Corrección de bug | `fix(api): corregir política RLS de personajes` |
| `docs` | Cambios en documentación | `docs(readme): actualizar guía de Supabase` |
| `style` | Formato, linting, espacios | `style(frontend): aplicar oxlint` |
| `refactor` | Refactorización sin cambio funcional | `refactor(ui): simplificar layout de cards` |
| `perf` | Mejoras de rendimiento | `perf(db): optimizar query de personajes` |
| `test` | Añadir o corregir tests | `test(frontend): agregar pruebas de character creation` |
| `chore` | Tareas de mantenimiento | `chore(deps): actualizar supabase-cli` |

**Áreas habituales en este proyecto:** `frontend`, `supabase`, `db`, `ui`, `auth`, `deps`, `ci`.

Reglas generales:

- Mensaje corto máximo 50 caracteres.
- Imperativo: "Agregar feature", no "Agregado feature".
- Body opcional para qué y por qué.
- Footer opcional:

```
BREAKING CHANGE: cambia el esquema de la tabla characters
Closes #42
```

> Nota: los commits históricos usan `Feat:` / `Chore:` (con mayúscula). A partir de ahora, en minúscula y con alcance: `feat(frontend): ...`.

## Flujo de trabajo (Git Flow simplificado)

Siempre partir de `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre
```

Commits frecuentes y atómicos. Al terminar la feature:

```bash
git checkout develop
git pull origin develop
git merge --no-ff feature/nombre
git push origin develop
```

Releases:

```bash
git checkout develop
git checkout -b release/vX.Y.Z
# Ajustes menores y pruebas
git checkout main
git merge --no-ff release/vX.Y.Z
git tag vX.Y.Z
git push origin main --tags
git checkout develop
git merge --no-ff release/vX.Y.Z
```

Hotfixes críticos:

```bash
git checkout main
git checkout -b hotfix/nombre
# arreglar bug
git checkout main
git merge --no-ff hotfix/nombre
git tag vX.Y.Z+1
git push origin main --tags
git checkout develop
git merge --no-ff hotfix/nombre
```

## Recomendaciones adicionales

- Antes de PR: `git pull --rebase` para evitar conflictos.
- Usar reviewers en Pull Requests.
- Evitar commits que rompan el build: `npm run build` y `npm run lint` deben pasar en `frontend/`.
- Mantener PRs pequeños y enfocados en una sola feature o bugfix.

## Higiene de git (lo que NUNCA se commitea)

Estos archivos están en `.gitignore` y **no deben trackearse jamás**:

| Qué | Por qué |
|---|---|
| `node_modules/` | Dependencias; se regeneran con `npm install`. Nunca commiteadas. |
| `dist/`, `dist-ssr/` | Output de build; se genera con `npm run build`. |
| `.env`, `.env.*` | Secretos (anon key, service_role key, tokens). Ver `frontend/.env.example` para la plantilla. |
| `.atl/` | Herramientas locales (skill registry, estado del agente). |
| `supabase/.temp/`, `supabase/.branches/` | Estado local del CLI de Supabase. |
| Logs (`*.log`), archivos de editor (`.vscode/`, `.idea/`, `.DS_Store`) | Ruido local. |

Reglas:

- **Antes de `git add`**: correr `git status` y verificar que solo entran los archivos intencionales.
- **Nunca `git add .` o `git add -A` a ciegas** — revisar siempre qué se va a trackear.
- Si un archivo ya trackeado debería ignorarse (ej. se commiteó `.env` por error): `git rm --cached <archivo>` y committear el cambio. El archivo deja de trackearse, pero **queda en el historial** (ver sección Historial pesado).
- `.env.example` **sí se commitea**: es la plantilla pública de variables (sin valores reales).

### Historial pesado (node_modules/binarios commiteados históricamente)

El repo tiene un pasado con `node_modules` commiteado (binarios win32, ~230 MB) y `frontend/.env` en el historial. Aunque ya no están trackeados, **siguen en la historia de git** y cada clon los descarga.

- Si el equipo lo acepta: no hacer nada, el repo sigue funcionando (solo es más pesado de clonar).
- Si molesta: reescribir historia con `git filter-repo` (purgar `node_modules/` y `.env` de todo el historial) y **force-push** a las ramas compartidas. Esto **cambia los hashes de todos los commits** → todos los colaboradores deben re-clonar. **Decisión de equipo, nunca automática.**

## Migraciones (Supabase)

En lugar de Django:

```bash
# Crear una nueva migración
supabase migration new nombre_de_la_migración

# Aplicar localmente (genera el diff y actualiza)
supabase db diff

# Push a staging/producción
supabase db push
```

Los archivos van en `supabase/migrations/` con formato `YYYYMMDDHHMMSS_nombre.sql` (ya hay un baseline: `20260917000001_initial_schema.sql`).

### Reglas de migraciones

- **Nunca editar una migración ya aplicada** (local o remota): si el esquema cambia, crear una migración nueva. Las migraciones son el historial inmutable de la DB.
- El baseline (`0001`, `0002`) **reproduce el estado real** fielmente, incluidas inconsistencias; los fixes van en migraciones posteriores.
- Mantener local y remoto alineados: después de crear una migración, aplicarla local (`supabase migration up`) y, cuando esté aprobada, al remoto (`supabase db push`).
- Nombrar con prefijo descriptivo: `fix_`, `feat_`, `chore_` (ej. `20260923000001_fix_character_languages_rls.sql`).
- `ON DELETE CASCADE` en tablas hijas de `characters` es la convención actual (borrar un personaje limpia sus hijos).
- **RLS siempre habilitado** en tablas nuevas. Nunca policies `USING (true)` / `WITH CHECK (true)` sin owner-scope: toda policy debe acotarse a `auth.uid()`.

## Definition of Done (antes de mergear a `develop`)

- [ ] `npm run build` pasa en `frontend/`.
- [ ] `npm run lint` pasa en `frontend/`.
- [ ] Cambios de DB: migración nueva aplicada en local, verificada, y el historial local = remoto.
- [ ] Sin archivos no intencionales en el commit (`git status` limpio de `node_modules`, `.env`, `.atl`, logs).
- [ ] Commit con Conventional Commits (minúscula + alcance): `fix(supabase): ...`, `feat(frontend): ...`.
- [ ] PR apuntando a `develop` con descripción clara de qué y por qué.
