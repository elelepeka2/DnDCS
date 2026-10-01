import { m } from 'framer-motion';
import { orientationFor } from '../../../dice/rollDice';

// Pseudo-3D tier — d10/d12/d20 as static clip-path silhouettes with inlined
// facet tables and a transform-only tilt (spec IMM-D4, design decision 4).
// The vertex data is gnuton-style geometry inlined as JS consts — no dependency
// (IMM-A2: no three/R3F/Spline). clip-path is never animated: the settle and
// the hover tilt move transform only. The settle pose is the engine's
// value-keyed orientation, so equal value always lands identically (Face/Repeat).
const LIGHT = 'linear-gradient(160deg, var(--color-ink-50), var(--color-ink-200))';
const MID = 'linear-gradient(160deg, var(--color-ink-200), var(--color-ink-400))';
const DARK = 'linear-gradient(160deg, var(--color-ink-200), var(--color-ink-700))';

// Per-type silhouette: the outer clip-path outline plus the facet wedges that
// tile it. d10 = trapezohedron pole view (5 kites from the center); d12 =
// face-on dodecahedron (central pentagon + 5 wedges); d20 = icosahedron face
// with its 3 neighbors (hexagon outline, central triangle carries the number).
const SILHOUETTES = {
  10: {
    clip: 'polygon(50% 0, 97.5% 34.5%, 79.4% 90.5%, 20.6% 90.5%, 2.5% 34.5%)',
    bg: LIGHT,
    facets: [
      { clip: 'polygon(50% 50%, 50% 0, 97.5% 34.5%)', bg: LIGHT },
      { clip: 'polygon(50% 50%, 97.5% 34.5%, 79.4% 90.5%)', bg: MID },
      { clip: 'polygon(50% 50%, 79.4% 90.5%, 20.6% 90.5%)', bg: DARK },
      { clip: 'polygon(50% 50%, 20.6% 90.5%, 2.5% 34.5%)', bg: MID },
      { clip: 'polygon(50% 50%, 2.5% 34.5%, 50% 0)', bg: MID },
    ],
  },
  12: {
    clip: 'polygon(50% 0, 97.5% 34.5%, 79.4% 90.5%, 20.6% 90.5%, 2.5% 34.5%)',
    bg: LIGHT,
    facets: [
      { clip: 'polygon(50% 0, 97.5% 34.5%, 76% 40%, 50% 21%)', bg: MID },
      { clip: 'polygon(97.5% 34.5%, 79.4% 90.5%, 66% 71%, 76% 40%)', bg: MID },
      { clip: 'polygon(79.4% 90.5%, 20.6% 90.5%, 34% 71%, 66% 71%)', bg: DARK },
      { clip: 'polygon(20.6% 90.5%, 2.5% 34.5%, 24% 40%, 34% 71%)', bg: MID },
      { clip: 'polygon(2.5% 34.5%, 50% 0, 50% 21%, 24% 40%)', bg: MID },
      { clip: 'polygon(50% 21%, 76% 40%, 66% 71%, 34% 71%, 24% 40%)', bg: LIGHT },
    ],
  },
  20: {
    clip: 'polygon(50% 22%, 95% 45%, 78% 78%, 50% 95%, 22% 78%, 5% 45%)',
    bg: LIGHT,
    facets: [
      { clip: 'polygon(22% 78%, 78% 78%, 50% 95%)', bg: DARK },
      { clip: 'polygon(50% 22%, 22% 78%, 5% 45%)', bg: MID },
      { clip: 'polygon(78% 78%, 50% 22%, 95% 45%)', bg: MID },
      { clip: 'polygon(50% 22%, 78% 78%, 22% 78%)', bg: LIGHT },
    ],
  },
};

// FAB → RollPanel tier renderer: one count===1 pseudo die per roll, value-keyed
// bounded tilt on settle (Face/Repeat), hover tilt on the wrapper only — the
// clip-path itself never animates. 6/9 stay underlined like the true tier.
export function PseudoDie({ sides, value, settled, size = 112, prefersReduced = false }) {
  const silhouette = SILHOUETTES[sides];
  const rotation = settled ? orientationFor(sides, value) : { x: 0, y: 0 };
  return (
    <div style={{ width: size, height: size, perspective: '700px' }}>
      <m.div
        className="relative h-full w-full"
        whileHover={prefersReduced ? undefined : { rotateX: 10, rotateY: -12 }}
        transition={{ type: 'tween', duration: 0.35 }}
      >
        <m.div
          className="absolute inset-0"
          style={{ clipPath: silhouette.clip, background: silhouette.bg }}
          animate={{ rotateX: rotation.x, rotateY: rotation.y }}
          transition={prefersReduced ? { duration: 0 } : { type: 'tween', duration: 0.6 }}
        >
          {silhouette.facets.map((facet, i) => (
            <div
              key={i}
              className="absolute inset-0"
              style={{ clipPath: facet.clip, background: facet.bg }}
            />
          ))}
          <span
            className="absolute inset-0 flex items-center justify-center font-bold"
            style={{
              fontSize: Math.round(size * 0.34),
              lineHeight: 1,
              color: 'var(--color-ink-950)',
              ...(value === 6 || value === 9
                ? {
                    textDecorationLine: 'underline',
                    textUnderlineOffset: '0.16em',
                    textDecorationThickness: '0.08em',
                  }
                : null),
            }}
          >
            {value}
          </span>
        </m.div>
      </m.div>
    </div>
  );
}