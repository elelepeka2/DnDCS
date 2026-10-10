# DnDCS — Gestor de Hojas de Personaje de Dungeon & Dragons

README de desarrollo — contexto importante para trabajar en este repositorio.

## Stack

| Capa | Tech |
|-------|------|
| Frontend | React 19 + Vite 8 (`frontend/`), Tailwind CSS v4, framer-motion 13 (LazyMotion) |
| Iconos de UI | lucide-react |
| Backend/DB | Supabase (proyecto remoto) vía `@supabase/supabase-js` |
| Lint | oxlint |
| Tests | **Ninguno — no existe test runner.** Verificación = `npm run build` + `npm run lint` + readback estructural |
| SDD | Almacén de artefactos Engram (sin carpeta `openspec/`), dispatcher nativo `gentle-ai sdd-status` |

## Comandos

```bash
cd frontend
npm run dev      # servidor de desarrollo, puerto 5173
npm run build    # build de producción (debe pasar antes de cualquier entrega)
npm run lint     # oxlint (se requiere exit 0; se toleran las advertencias preexistentes en la lógica de tabs)
```

El frontend se comunica con un proyecto Supabase **remoto** mediante `frontend/.env`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). No se requiere el stack local de
Supabase para ejecutar la app. El esquema versionado vive en `supabase/migrations/`.

## Estructura del proyecto (frontend/src)

```
App.jsx                     # rutas (/login, /register, /dashboard, /character/:id) + árbol de LazyMotion + montaje del FAB de dados
index.css                   # tokens de diseño @theme (fuente única de verdad visual)
pages/                      # Login, Register, Dashboard (+ CreateCharacterModal en components/ui)
features/character/
  CharacterDetailView.jsx   # shell del personaje + barra de 6 tabs (pill con layoutId)
  components/               # ClassTab, InventoryTab, EquipmentTab, BiographyTab, ProfileTab, StatsTab
features/admin/              # AdminPage (gate fail-closed recheckRole) + UserDirectory + CharacterDirectory (solo lectura)
  components/               # CharacterDirectory, UserDirectory, ConfirmActionDialog
components/ui/              # Modal, FloatingDiceButton, RollPanel (renderizador de dados en canvas 2D)
components/ui/dice/         # CanvasDie + diceGeometry (6 poliedros, proyección 3D real)
components/decorative/      # AmbientLayer, Particles, LineArt, CharacterSprite (decoración con aria-hidden)
```

Patrón de datos: cada componente llama directamente al cliente `supabase` compartido
(fetch + autosave con debounce). Las tabs reciben `({character, onCharacterUpdate})`.

## Sistema de diseño (post `frontend-redesign`, 2026-09)

- **Minimalista blanco y negro, orientado a oscuro (dark-first).** Tokens en `frontend/src/index.css` (`@theme`): escala de grises `ink`, acento rojo `signal` (`#FF4F45` — SOLO crítico de HP, errores y acciones destructivas, ≤3 usos por archivo), radio (estructura 0 / controles 8px / pills 999px), sombras solo en overlays.
- **Tipografía**: Space Grotesk (`--font-sans`, presupuesto ≤25 KB gz) + `ui-monospace` del sistema para numerales.
- **Motion (framer-motion)**: `LazyMotion strict domMax` + `MotionConfig reducedMotion="user"`. Constantes compartidas en `features/character/motionVariants.js`: enter 225ms / exit 195ms / desktop 175ms / tab pill 180ms / stagger 20ms. Eases asimétricos; **exactamente UNA spring en toda la app** (la de los dados, 220/18) — las springs están reservadas para momentos hero.
- **Dados**: FAB global flotante → panel de roll; **renderizador canvas 2D con proyección 3D real** (`CanvasDie` + `diceGeometry`) — los seis poliedros (d4 tetraedro, d6 cubo, d8 octaedro, d10 trapezoedro pentagonal, d12 dodecaedro, d20 icosaedro), painter's algorithm, shading de caras con rampa de tinta, caras numeradas (6/9 subrayados), settle determinista (mismo valor ⇒ misma pose), tumble de 760ms al tirar (rAF, idle después), reduced-motion = cara asentada instantánea. Historial de las últimas 5 tiradas en `localStorage` (`dndcs.dice.history`).
- **Héroes**: split-hero de Login (55/45, numeral outline, capas z); banda hero del Dashboard con wordmark **"DND:DOS"** + un d20 que gira lentamente (`dash-spin` 24s).
- **Decoración ambiental** (`components/decorative/`): capa fixed con aria-hidden y zonas lejanas/cercanas — motas de polvo (DOM ≤50, canvas por encima), line-art SVG de d20 con giro de 22s + respiración de 8s, sprite de personaje estático; keyframes CSS solo de transform/opacity, will-change transitorio, reduced-motion detiene los loops con el contenido visible.
- **Presupuesto de bundle**: total ≤60 KB gz de delta vs la línea base pre-redesign (medido: **+48.24 — PASS**, holgura 11.76). El subtecho de motion de +42.14 vs ≤30 se aceptó como excepción (domMax lo requiere la tab pill con `layoutId`).

## Convenciones (no romper estas)

1. **Ediciones solo de presentación en archivos de tabs/lógica**: nunca tocar handlers, llamadas a Supabase ni la lógica de `useState`/`useEffect` — no hay test runner como red de seguridad. Solo `className`/estructura JSX/copy.
2. **Sin utilidades de paleta legacy**: el grep de `(text|bg|border|…)-(gray|slate|indigo|emerald|cyan|rose|sky)-N` debe mantenerse en cero. Los colores nuevos pasan por los tokens de `@theme`.
3. **Máximo una spring** (solo los dados). Las transiciones comunes usan eases, no springs elásticas.
4. Commits convencionales, sin líneas de atribución o co-autoría. Ejemplo: `feat(frontend): restyle dashboard with design tokens`.
5. Los cambios SDD pasan por el dispatcher (`gentle-ai sdd-status --cwd . --json`) — enrutar solo por `nextRecommended`; el almacén de artefactos es Engram (los guardados ligados a sesión requieren un `session_id` explícito).

## Git / estado de entrega

- **Entregado en `develop` y `main`** (push autorizado por el propietario, 2026-10-01). La rama de trabajo activa `experiment/frontend-redesign` se **conserva** (no eliminada) con el historial completo de immersive-ui.
- **Admin entregado en `develop`** (2026-10-10): `admin-profiles` (PR #6) + `admin-characters` (PRs #7–#10), todos con merge commit y ramas limpiadas. Los cambios de `admin-characters` aplican la migración `20261009000001_feat_admin_characters_readonly.sql` al proyecto Supabase remoto.
- Plan de entrega (decidido): merges apilados (stacked-to-main) sobre `develop` — 7 lotes (motor NdX → dados true-3D → dados pseudo-3D → hero de login → hero del dashboard → kit ambiental → rediseño de dados en canvas), cada uno ≤400 líneas + scripts de chequeo commiteados.
- El historial de merges vive en `develop` (PRs #2–#5 de character-tabs + immersive-ui).

## Registro de cambios SDD (Engram)

| Cambio | Estado | Artefactos clave |
|--------|-------|---------------|
| `character-tabs` | archivado | tabs de inventario/equipo/biografía + migración RLS, entregado como 4 PRs apilados |
| `frontend-redesign` | archivado (obs #49) | rediseño B&W + motion + dados CSS-3D; verify: PASS con advertencias, 0 críticos |
| `immersive-ui` | archivado (obs #77) | motor NdX, dados true/pseudo, héroes, kit ambiental; verify PASS 23/23; rediseño post-archivado: dados canvas 2D + hero DND:DOS + ambiental visible |
| `admin-profiles` | archivado | `public.profiles` (role player/admin) + `private.is_admin()` + Edge Functions ban/delete/set-password + RLS; PR #6 mergeado (`2c0e8f1`) |
| `admin-characters` | archivado | visibilidad admin de **solo lectura** de personajes: 4 policies RLS SELECT-only + detalle read-only fail-closed (17 guards) + directorio paginado + conteos por usuario; PRs #7–#10, verify PASS 17/17, walkthroughs de runtime PASS (Playwright) |

## PENDIENTES

### 1. Verificación manual (sin navegador headless en el entorno; los scripts de chequeo cubren estructura, no píxeles)

Ejecutar `cd frontend && npm run dev` y verificar:

- [ ] **Dados**: tirar cada tipo d4–d20 → el tumble se ve físico, la cara asentada coincide con el resultado del chip, nitidez DPR/retina, fila compacta de 40px legible
- [ ] **Hero del Dashboard**: wordmark "DND:DOS" + d20 girando visible; reduced-motion detiene el giro, el contenido permanece
- [ ] **Ambiental**: motas/líneas derivando visiblemente en todas las rutas; reduced-motion detiene los loops
- [ ] **S5** DevTools: las transiciones miden ≈225/195/175/180ms, stagger 20ms (ni lentas ni bruscas)
- [ ] **S7** Cambiar de tabs → la pill se desliza suavemente (180ms, sin rebote)
- [ ] **S9/S10** reduced-motion del SO activado → fades/instantáneo, sin áreas bloqueadas/invisibles
- [ ] **S12** Tocar el FAB de dados en Login, Dashboard y pantallas de personaje → el panel se abre en el lugar

### 2. Desviaciones menores conocidas (aceptadas, no bloqueantes)

- Historial de dados persistido en `localStorage` en lugar del `useState` del diseño (silencio en la spec).
- El d4 se asienta con la cara tirada hacia adelante (1 cara visible) — forzado geométricamente por el contrato cara-a-la-cámara; un reposo de pirámide de 3 caras sería un caso especial de una línea si se desea.
- El script de chequeo `s6` tiene hardcodeados los conteos de los demás scripts — actualizar en lockstep ante cambios futuros.
- El informe de verify se persistió como un **guardado sin validar** etiquetado explícitamente (falta el comando validador en gentle-ai 3.7.0 instalado).
