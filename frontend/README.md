# DnDCS Frontend — Development Guide

DnDCS is a D&D character manager (React SPA + Supabase). This README is the working document for developers: how to run it, how it is structured, the design system it follows, and what is still pending.

## Quick path

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

1. `frontend/.env` must define `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (points at the **remote** Supabase project; no local stack needed).
2. Verify: the dev server serves the login screen and `npm run build && npm run lint` both exit 0.

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build (gate before every commit) |
| `npm run lint` | Oxlint (gate before every commit) |

## Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + Vite (Oxc) |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/index.css`) |
| Motion | framer-motion@13 via `LazyMotion` + `m.*` (`domMax`) |
| Data | Supabase JS v2 (direct client calls, per-component fetch + debounced autosave) |
| Icons | lucide-react |
| Tests | **None** — no test runner; gates are build + lint + static audits |

## Architecture

```
src/
├── App.jsx                  # Router, auth gate, LazyMotion/MotionConfig, dice FAB mount
├── index.css                # @theme design tokens (single source of visual truth)
├── pages/                   # Login, Register, Dashboard
├── components/ui/           # Modal, FloatingDiceButton, RollPanel (dice)
└── features/character/      # CharacterDetailView (tab shell) + 6 tabs
    └── components/          # Class, Inventory, Equipment, Biography, Profile, Stats
```

| Rule | Why |
|------|-----|
| Presentation-only edits in existing files | No test runner: handlers, Supabase calls, and state flow must never change during UI work |
| Tokens before screens | A restyle slice never lands before the tokens it consumes |
| StatsTab/ProfileTab are the riskiest | Largest files with entangled logic — touch last, structure-only |
| One commit per work unit | Each slice maps to one reviewable PR unit |

## Design system (B&W, dark-first)

| Decision | Value |
|----------|-------|
| Palette | `ink-*` grayscale ramps (dark-first) — no legacy colors (`gray/indigo/slate/...`) anywhere |
| Accent | Single signal red `#FF4F45` / press `#E03A31` (`signal-*`) — HP, errors, destructive actions only (≤3 uses/file) |
| Typography | Space Grotesk (`--font-sans`, variable latin) + system `ui-monospace` for numerals |
| Radius | Structure: `0` + 1px `white/10` hairline · Controls: `8px` (`rounded-control`) · Pills/FAB: `999px` (`rounded-pill`) |
| Depth | Shadows only on overlays (modal/roll panel); flat everywhere else |
| Copy | Spanish (product language); new UI strings are defined in design artifacts |

## Motion language

| Rule | Value |
|------|-------|
| Entry / exit | 225ms / 195ms (asymmetric eases: decel in, accel out) |
| Desktop baseline | 150–200ms · Tab pill 180ms · List stagger 20ms |
| Springs | **Exactly one in the app**: the dice tumble (220/18). Never on ordinary transitions (M3 rule) |
| Reduced motion | `MotionConfig reducedMotion="user"` + CSS `prefers-reduced-motion` fallback |
| Bundle path | `LazyMotion strict domMax` + `m.*` only — never `motion.*` imports |

## Dice feature (current)

- **Global FAB** (`FloatingDiceButton`, bottom-right) mounts at App level → opens `RollPanel` on any screen.
- **Deterministic d6**: face → fixed rotation map + 2–3 extra 360° turns; pure functions (`FACE_ROTATIONS`, `rotationForFace`) mathematically proven (face normal → viewer +z for all 6 faces).
- CSS 3D cube only (`perspective` + `preserve-3d`), **0 new dependencies**.
- Last-5 roll history in `localStorage` (`dndcs.dice.history`).
- `useReducedMotion` → instant orientation + fade (no tumble).

## Bundle budget

| Metric | Value | Status |
|--------|-------|--------|
| Baseline (pre-redesign) | 151.31 KB gz | — |
| Current | 195.01 KB gz | — |
| Total delta ceiling | **≤60 KB gz** | ✅ +43.70 |
| Motion sub-ceiling ≤30 | +42.14 | ⚠️ Accepted exception (`domMax` required by spec `layoutId`) |
| Dice | +1.56 KB | ✅ (0 deps) |

## Branch & delivery state

- Branch: `experiment/frontend-redesign` — 16 local commits (`36b58bf..88519e1`), **never pushed; remote is off-limits until explicitly authorized**.
- Delivery: 8 chained slices, stacked-to-main onto `develop` (tokens → auth → dashboard+modal → shell → tabs → motion → dice → cleanup). All slices are implemented locally as work-unit commits.
- SDD cycle: explore → research → propose → spec → design → tasks → apply (6 batches) → verify. Artifacts live in Engram (`sdd/frontend-redesign/*`); verify verdict: **PASS WITH WARNINGS** (0 critical, 0 logic drift across 267 audited deleted lines).

## Pending

### Human QA (blocked: no headless browser in the environment)

Run `npm run dev` and check:

- [ ] **S5** Timings feel right: entries 225ms / exits 195ms / tabs 175ms / pill 180ms — neither sluggish nor jumpy
- [ ] **S7** Switching tabs slides the pill without bounce
- [ ] **S8** Create-character modal opens/closes (exit ≤195ms, not clickable during exit)
- [ ] **S9** OS reduced-motion ON → navigation/tabs/modals become instant fades
- [ ] **S10** Reduced-motion + modal close → no blocked/invisible areas
- [ ] **S12** Dice FAB works on Login, Dashboard, and Character screens (absent during auth splash = expected)
- [ ] **S15/S13** Reduced-motion roll shows instant face; normal roll's visible face matches the result

### Open items

- [ ] Archive the `frontend-redesign` SDD change (after QA passes)
- [ ] Push + create the 8 chained PRs to `develop` — **only when explicitly authorized**
- [ ] `--font-display` token is defined but tree-shaken (use it for headings or drop it)
- [ ] 18 pre-existing lint warnings in untouched effect/hook logic (ProfileTab/StatsTab/…)
- [ ] Dice history lives in `localStorage` vs design's `useState` (spec-silent; decide which stands)
- [ ] `gentle-ai sdd-verify-validate` missing in gentle-ai 3.7.0 (verify report was persisted as an unvalidated save)
