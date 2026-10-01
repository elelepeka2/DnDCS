# DnDCS — Dungeon & Dragons Character Sheet Manager

Development README — important context for working on this repo.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 8 (`frontend/`), Tailwind CSS v4, framer-motion 13 (LazyMotion) |
| UI icons | lucide-react |
| Backend/DB | Supabase (remote project) via `@supabase/supabase-js` |
| Lint | oxlint |
| Tests | **None — no test runner exists.** Verification = `npm run build` + `npm run lint` + structural readback |
| SDD | Engram artifact store (no `openspec/` folder), native dispatcher `gentle-ai sdd-status` |

## Commands

```bash
cd frontend
npm run dev      # dev server, port 5173
npm run build    # production build (must pass before any hand-off)
npm run lint     # oxlint (exit 0 required; pre-existing warnings in tab logic are tolerated)
```

The frontend talks to a **remote** Supabase project via `frontend/.env`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). The local Supabase stack is not
required to run the app. Versioned schema lives in `supabase/migrations/`.

## Project layout (frontend/src)

```
App.jsx                     # routes (/login, /register, /dashboard, /character/:id) + LazyMotion tree + dice FAB mount
index.css                   # @theme design tokens (single source of visual truth)
pages/                      # Login, Register, Dashboard (+ CreateCharacterModal in components/ui)
features/character/
  CharacterDetailView.jsx   # character shell + 6-tab bar (layoutId pill)
  components/               # ClassTab, InventoryTab, EquipmentTab, BiographyTab, ProfileTab, StatsTab
components/ui/              # Modal, FloatingDiceButton, RollPanel (canvas 2D dice renderer)
components/ui/dice/         # CanvasDie + diceGeometry (6 polyhedra, real 3D projection)
components/decorative/      # AmbientLayer, Particles, LineArt, CharacterSprite (aria-hidden decor)
```

Data pattern: every component calls the shared `supabase` client directly
(fetch + debounced autosave). Tabs receive `({character, onCharacterUpdate})`.

## Design system (post `frontend-redesign`, 2026-09)

- **Dark-first minimalist black & white.** Tokens in `frontend/src/index.css` (`@theme`): `ink` gray scale, `signal` red accent (`#FF4F45` — HP-critical/errors/destructive ONLY, ≤3 uses per file), radius (structure 0 / controls 8px / pills 999px), shadows on overlays only.
- **Typography**: Space Grotesk (`--font-sans`, ≤25 KB gz budget) + system `ui-monospace` for numerals.
- **Motion (framer-motion)**: `LazyMotion strict domMax` + `MotionConfig reducedMotion="user"`. Shared constants in `features/character/motionVariants.js`: enter 225ms / exit 195ms / desktop 175ms / tab pill 180ms / stagger 20ms. Asymmetric eases; **exactly ONE spring in the whole app** (the dice, 220/18) — springs are reserved for hero moments.
- **Dice**: floating global FAB → roll panel; **canvas 2D renderer with real 3D projection** (`CanvasDie` + `diceGeometry`) — all six polyhedra (d4 tetrahedron, d6 cube, d8 octahedron, d10 pentagonal trapezohedron, d12 dodecahedron, d20 icosahedron), painter's algorithm, ink-ramp face shading, numbered faces (6/9 underlined), deterministic settle (same value ⇒ same pose), 760ms tumble on roll (rAF, idle after), reduced-motion = instant settled face. Last-5 history in `localStorage` (`dndcs.dice.history`).
- **Heroes**: Login split-hero (55/45, outline numeral, z-layers); Dashboard hero band with **"DND:DOS"** wordmark + a slowly tumbling d20 (`dash-spin` 24s).
- **Ambient decor** (`components/decorative/`): aria-hidden fixed layer with far/near zones — dust motes (DOM ≤50, canvas beyond), d20 SVG line-art turning 22s + breathing 8s, static character sprite; CSS keyframes transform/opacity-only, transient will-change, reduced-motion stops loops with content visible.
- **Bundle budget**: total ≤60 KB gz delta vs pre-redesign baseline (measured: **+48.24 — PASS**, headroom 11.76). Motion sub-ceiling +42.14 vs ≤30 was accepted as an exception (domMax is required by the `layoutId` tab pill).

## Conventions (do not break these)

1. **Presentation-only edits in tab/logic files**: never touch handlers, Supabase calls, `useState`/`useEffect` logic — there is no test runner as a safety net. `className`/JSX-structure/copy only.
2. **No legacy palette utilities**: grep for `(text|bg|border|…)-(gray|slate|indigo|emerald|cyan|rose|sky)-N` must stay at zero. New colors go through `@theme` tokens.
3. **One spring max** (dice only). Common transitions use eases, not bouncy springs.
4. Conventional commits, no AI attribution/co-author lines. Example: `feat(frontend): restyle dashboard with design tokens`.
5. SDD changes run through the dispatcher (`gentle-ai sdd-status --cwd . --json`) — route only by `nextRecommended`; artifact store is Engram (session-bound saves need an explicit `session_id`).

## Git / delivery state

- **Delivered to `develop` and `main`** (owner-authorized push, 2026-10-01). Active work branch `experiment/frontend-redesign` **retained** (not deleted) with the full immersive-ui history.
- Delivery plan (decided): stacked-to-main onto `develop` — 7 slices (NdX engine → true-3D dice → pseudo-3D dice → login hero → dashboard hero → ambient kit → canvas dice redesign), each ≤400 lines + committed check scripts.
- Merged history lives on `develop` (character-tabs PRs #2–#5 + immersive-ui).

## SDD change log (Engram)

| Change | State | Key artifacts |
|--------|-------|---------------|
| `character-tabs` | archived | inventory/equipment/biography tabs + RLS migration, delivered as 4 stacked PRs |
| `frontend-redesign` | archived (obs #49) | B&W redesign + motion + CSS-3D dice; verify PASS WITH WARNINGS, 0 CRITICAL |
| `immersive-ui` | archived (obs #77) | NdX engine, true/pseudo dice, heroes, ambient kit; verify PASS 23/23; post-archive redesign: canvas 2D dice + DND:DOS hero + visible ambient |

## PENDING

### 1. Human QA (no headless browser in env — check scripts cover structure, not pixels)

Run `cd frontend && npm run dev` and check:

- [ ] **Dice**: roll each type d4–d20 → tumble looks physical, settled face matches the chip result, DPR/retina crispness, compact 40px row legible
- [ ] **Dashboard hero**: "DND:DOS" wordmark + tumbling d20 visible; reduced-motion stops the spin, content stays
- [ ] **Ambient**: motes/lines visibly drifting on all routes; reduced-motion stops loops
- [ ] **S5** DevTools: transitions measure ≈225/195/175/180ms, stagger 20ms (neither sluggish nor jumpy)
- [ ] **S7** Switch tabs → pill slides smoothly (180ms, no bounce)
- [ ] **S9/S10** OS reduced-motion ON → fades/instant, no blocked/invisible areas
- [ ] **S12** Tap the dice FAB on Login, Dashboard, and character screens → panel opens in place

### 2. Known minor deviations (accepted, non-blocking)

- Dice history persisted in `localStorage` instead of the design's `useState` (spec-silent).
- d4 settles with the rolled face flat-on (1 visible face) — geometrically forced by the face-at-camera contract; a 3-face pyramid rest is a one-line special case if desired.
- `s6` check script hardcodes the other scripts' counts — update in lockstep on future changes.
- Verify report was persisted as an explicitly-labeled **unvalidated save** (validator command missing in installed gentle-ai 3.7.0).
