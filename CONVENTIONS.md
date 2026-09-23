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
