// IMM-A2: pre-rendered static adventurer sprite — flat ink silhouette,
// no motion, no runtime 3D engines (the forbidden dependency set). The
// tabletop miniature reading: hooded figure with a blade, waiting at the
// table's edge. Rendered once by AmbientLayer, never moves.
export function CharacterSprite() {
  return (
    <svg
      className="char-sprite"
      viewBox="0 0 120 160"
      aria-hidden="true"
      focusable="false"
    >
      {/* Hood: rounded crown above the shoulders. */}
      <path d="M60 9 a15 16 0 1 0 0.01 0 z" fill="var(--color-ink-800)" />
      {/* Cloak: hood peak + shoulders flaring to the hem. */}
      <path d="M45 40 L60 6 L75 40 L78 44 L74 128 L46 128 L42 44 Z" fill="var(--color-ink-800)" />
      {/* Blade: hairline steel at the figure's side. */}
      <path d="M66 62 L66 122" stroke="var(--color-ink-700)" strokeWidth="3" fill="none" />
      <path d="M61 62 L71 62" stroke="var(--color-ink-700)" strokeWidth="2.5" fill="none" />
    </svg>
  );
}