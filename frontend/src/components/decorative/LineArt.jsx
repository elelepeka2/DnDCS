// IMM-A1 line-art motifs: an SVG d20 outline in ink strokes only — the
// app's own dice identity as quiet tabletop line art. The loop is a CSS
// keyframe (`.ambient-loop`, index.css): transform-only rotation, 60s.
// aria-hidden + focusable=false: decorative, never announced.
export function LineArt({ className = '' }) {
  return (
    <svg
      className={`lineart lineart--d20 ambient-loop ${className}`}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      {/* d20 face-on: flat-top hexagon + icosahedron neighbours, echoing the
          PseudoDie d20 silhouette polygon (dice identity, hairline weight). */}
      <polygon
        points="60,26.4 114,54 114,91.2 60,118.8 6,91.2 6,54"
        fill="none"
        stroke="var(--color-ink-700)"
        strokeWidth="1"
      />
      <path
        d="M60 26.4 L60 62 M60 62 L114 54 M60 62 L6 54 M60 62 L60 118.8"
        fill="none"
        stroke="var(--color-ink-800)"
        strokeWidth="1"
      />
    </svg>
  );
}