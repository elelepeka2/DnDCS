# DnDCS Frontend — Guía de desarrollo

DnDCS es un gestor de personajes de D&D (React SPA + Supabase). Este README es el documento de trabajo para desarrolladores: cómo ejecutarlo, cómo está estructurado, el sistema de diseño que sigue y qué sigue pendiente.

## Ruta rápida

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

1. `frontend/.env` debe definir `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (apunta al proyecto **remoto** de Supabase; no se necesita stack local).
2. Verificar: el servidor de desarrollo sirve la pantalla de login y `npm run build && npm run lint` ambos con exit 0.

| Comando | Propósito |
|---------|---------|
| `npm run dev` | Servidor de desarrollo de Vite (puerto 5173) |
| `npm run build` | Build de producción (gate antes de cada commit) |
| `npm run lint` | Oxlint (gate antes de cada commit) |

## Stack

| Capa | Elección |
|-------|--------|
| Framework | React 19 + Vite (Oxc) |
| Estilos | Tailwind CSS v4 (tokens `@theme` en `src/index.css`) |
| Motion | framer-motion@13 vía `LazyMotion` + `m.*` (`domMax`) |
| Datos | Supabase JS v2 (llamadas directas al cliente, fetch por componente + autosave con debounce) |
| Iconos | lucide-react |
| Tests | **Ninguno** — no hay test runner; los gates son build + lint + auditorías estáticas |

## Arquitectura

```
src/
├── App.jsx                  # Router, auth gate, LazyMotion/MotionConfig, montaje del FAB de dados
├── index.css                # tokens de diseño @theme (fuente única de verdad visual)
├── pages/                   # Login, Register, Dashboard
├── components/ui/           # Modal, FloatingDiceButton, RollPanel (dados)
└── features/character/      # CharacterDetailView (shell de tabs) + 6 tabs
    └── components/          # Class, Inventory, Equipment, Biography, Profile, Stats
```

| Regla | Por qué |
|------|-----|
| Ediciones solo de presentación en archivos existentes | No hay test runner: los handlers, las llamadas a Supabase y el flujo de estado nunca deben cambiar durante el trabajo de UI |
| Tokens antes que pantallas | Un lote de restyle nunca aterriza antes de los tokens que consume |
| StatsTab/ProfileTab son los más riesgosos | Los archivos más grandes con lógica enredada — tocarlos al final, solo estructura |
| Un commit por unidad de trabajo | Cada lote corresponde a una unidad de PR revisable |

## Sistema de diseño (B&W, dark-first)

| Decisión | Valor |
|----------|-------|
| Paleta | rampas de grises `ink-*` (dark-first) — sin colores legacy (`gray/indigo/slate/...`) en ninguna parte |
| Acento | un solo rojo signal `#FF4F45` / press `#E03A31` (`signal-*`) — solo HP, errores y acciones destructivas (≤3 usos/archivo) |
| Tipografía | Space Grotesk (`--font-sans`, variable latin) + `ui-monospace` del sistema para numerales |
| Radio | Estructura: `0` + hairline `white/10` de 1px · Controles: `8px` (`rounded-control`) · Pills/FAB: `999px` (`rounded-pill`) |
| Profundidad | Sombras solo en overlays (modal/panel de roll); plano en el resto |
| Copy | Español (idioma del producto); las cadenas nuevas de UI se definen en los artefactos de diseño |

## Lenguaje de motion

| Regla | Valor |
|------|-------|
| Entrada / salida | 225ms / 195ms (eases asimétricos: decel in, accel out) |
| Línea base desktop | 150–200ms · Pill de tab 180ms · Stagger de lista 20ms |
| Springs | **Exactamente una en la app**: el tumble de los dados (220/18). Nunca en transiciones ordinarias (regla M3) |
| Reduced motion | `MotionConfig reducedMotion="user"` + fallback CSS `prefers-reduced-motion` |
| Ruta de bundle | `LazyMotion strict domMax` + solo `m.*` — nunca imports de `motion.*` |

## Funcionalidad de dados (actual)

- **FAB global** (`FloatingDiceButton`, abajo a la derecha) se monta a nivel de App → abre `RollPanel` en cualquier pantalla.
- **d6 determinista**: cara → mapa de rotación fijo + 2–3 vueltas extra de 360°; funciones puras (`FACE_ROTATIONS`, `rotationForFace`) probadas matemáticamente (normal de la cara → espectador +z en las 6 caras).
- Solo cubo CSS 3D (`perspective` + `preserve-3d`), **0 dependencias nuevas**.
- Historial de las últimas 5 tiradas en `localStorage` (`dndcs.dice.history`).
- `useReducedMotion` → orientación instantánea + fade (sin tumble).

## Presupuesto de bundle

| Métrica | Valor | Estado |
|--------|-------|--------|
| Línea base (pre-redesign) | 151.31 KB gz | — |
| Actual | 195.01 KB gz | — |
| Techo total de delta | **≤60 KB gz** | ✅ +43.70 |
| Subtecho de motion ≤30 | +42.14 | ⚠️ Excepción aceptada (`domMax` requerido por la spec `layoutId`) |
| Dados | +1.56 KB | ✅ (0 deps) |

## Ramas y estado de entrega

- Rama de trabajo `experiment/frontend-redesign` conservada (no eliminada) con el historial completo.
- Entregado en `develop` y `main` (2026-10-01) mediante merges apilados sobre `develop`.
- Ciclo SDD: explore → research → propose → spec → design → tasks → apply (6 lotes) → verify. Artefactos en Engram (`sdd/frontend-redesign/*`); veredicto: **PASS con advertencias** (0 críticos, 0 deriva lógica en 267 líneas auditadas).

## Pendiente

### Verificación manual (bloqueada: sin navegador headless en el entorno)

Ejecutar `npm run dev` y verificar:

- [ ] **S5** Los timings se sienten bien: entradas 225ms / salidas 195ms / tabs 175ms / pill 180ms — ni lentos ni bruscos
- [ ] **S7** Al cambiar de tabs la pill se desliza sin rebote
- [ ] **S8** El modal de crear personaje abre/cierra (exit ≤195ms, no cliqueable durante la salida)
- [ ] **S9** reduced-motion del SO activado → navegación/tabs/modales se vuelven fades instantáneos
- [ ] **S10** Reduced-motion + cierre de modal → sin áreas bloqueadas/invisibles
- [ ] **S12** El FAB de dados funciona en Login, Dashboard y pantallas de Personaje (ausente durante el splash de auth = esperado)
- [ ] **S15/S13** Una tirada con reduced-motion muestra la cara al instante; la cara visible de una tirada normal coincide con el resultado

### Ítems abiertos

- [ ] El token `--font-display` está definido pero sufre tree-shaking (usarlo en headings o eliminarlo)
- [ ] 18 advertencias de lint preexistentes en lógica de effect/hooks sin tocar (ProfileTab/StatsTab/…)
- [ ] El historial de dados vive en `localStorage` vs el `useState` del diseño (silencio en la spec; decidir cuál se mantiene)
- [ ] Falta `gentle-ai sdd-verify-validate` en gentle-ai 3.7.0 (el informe de verify se persistió como un guardado sin validar)
