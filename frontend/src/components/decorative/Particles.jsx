// IMM-A1 Canvas: ambient motes as DOM nodes up to 50; a single <canvas>
// replaces them beyond 50 (IMM-A1 Canvas). Deterministic: a seeded PRNG
// yields the same mote field for the same count, every render.
//
// DOM mode loops via CSS keyframes in index.css (transform/opacity only,
// see `.particle` + `ambient-mote`); canvas mode drifts via rAF, gated by
// prefers-reduced-motion. Both stay aria-hidden — decor, never content.
import { useEffect, useRef } from 'react';

// mulberry32 — tiny deterministic PRNG (seeded: same count ⇒ same field).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seeded field: position (%), size (px), loop duration/delay (s), drift
// vector (px) and peak opacity — all consumed as CSS custom properties.
function makeMotes(count, seed = 7) {
  const rand = mulberry32(seed);
  const motes = [];
  for (let i = 0; i < count; i += 1) {
    motes.push({
      x: Math.round(rand() * 92 + 4), // 4–96 %
      y: Math.round(rand() * 92 + 4),
      size: Math.round(rand() * 2 + 1), // 1–3 px
      dur: (rand() * 9 + 7).toFixed(1), // 7–16 s loop
      delay: (rand() * 6).toFixed(2), // 0–6 s stagger
      dx: Math.round(rand() * 60 - 30), // ±30 px drift
      dy: Math.round(rand() * 40 - 20),
      peak: (rand() * 0.25 + 0.35).toFixed(2), // 0.35–0.6 alpha
    });
  }
  return motes;
}

// Canvas fallback (count > 50): 2D motes on one canvas, rAF drift + alpha
// pulse. Reduced motion: one static frame, no loop — nothing hides.
function CanvasMotes({ count }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ink =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-ink-700')
        .trim() || '#2A2A2F';
    const motes = makeMotes(count);
    let raf = 0;

    const draw = (t) => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (w === 0 || h === 0) {
        if (!reduce.matches) raf = requestAnimationFrame(draw);
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t0 = t / 1000;
      ctx.fillStyle = ink;
      for (const m of motes) {
        const p = ((t0 + Number(m.delay)) / Number(m.dur)) % 1;
        const ease = Math.sin(p * Math.PI); // ease in-out over one loop
        ctx.globalAlpha = Number(m.peak) * ease;
        ctx.beginPath();
        ctx.arc(
          (m.x / 100) * w + Number(m.dx) * p,
          (m.y / 100) * h + Number(m.dy) * p,
          m.size / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduce.matches) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  return <canvas ref={ref} aria-hidden="true" className="ambient-canvas" />;
}

// DOM budget: ≤50 particles as <span> motes; >50 → canvas (IMM-A1 Canvas).
export function Particles({ count = 16, seed = 7 }) {
  const n = Math.max(0, Math.floor(count) || 0);
  if (n > 50) return <CanvasMotes count={n} />;
  const motes = makeMotes(n, seed);
  return (
    <span className="ambient-motes" aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          className="particle"
          style={{
            '--x': `${m.x}%`,
            '--y': `${m.y}%`,
            '--size': `${m.size}px`,
            '--dur': `${m.dur}s`,
            '--delay': `${m.delay}s`,
            '--dx': `${m.dx}px`,
            '--dy': `${m.dy}px`,
            '--peak': m.peak,
          }}
        />
      ))}
    </span>
  );
}