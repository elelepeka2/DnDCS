// CanvasDie — real 3D polyhedra rendered on a plain Canvas 2D context.
//
// Replaces the TrueDie (CSS-3D) and PseudoDie (clip-path silhouette) tiers
// with ONE renderer for all six dice (spec: dice redesign). Geometry and the
// deterministic settle derivation live in diceGeometry.js (pure, node-checked);
// this file only projects, shades and animates. No three.js / WebGL / spline —
// every vertex is rotated by hand and drawn with the painter's algorithm:
// backface culling (normal·+Z) → depth sort → per-face flat shading from
// face-normal·light, quantized to the app's ink ramp (light faces toward
// ink-50, dark toward ink-800). 6/9 stay underlined (existing convention).
//
// Motion: the roll tumbles via rAF (ease-out, ~760ms, deterministic path that
// lands EXACTLY on the value's settle pose), then goes idle — no perpetual
// loop. Reduced motion jumps straight to the settled pose. The canvas is
// aria-hidden: the number already lives in the result chip — decor, not
// content. devicePixelRatio-scaled, hero (112px) and compact (40px) sizes.

import { useCallback, useEffect, useRef } from 'react';
import { GEOMETRY, faceNormal, settleRotationFor } from './diceGeometry';

// Deterministic tumble: same value ⇒ same path ⇒ same final pose. 600–900ms.
const TUMBLE_MS = 760;
// Ink ramp, light → dark. Tone = 1 - face-normal·light, quantized to 5 steps.
const INK_RAMP = ['ink-50', 'ink-200', 'ink-400', 'ink-700', 'ink-800'];
// Light source: upper-left-front (world coords, y-up), normalized at draw time.
const LIGHT = [-0.45, 0.72, 0.52];
// Static idle pose for the unsettled die (before the first roll).
const IDLE_POSE = { x: 14, y: -22 };
// Only draw a face's number when it faces the camera enough to stay legible.
const NUMBER_FACE_DOT = 0.28;

const rotateY = ([x, y, z], deg) => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [x * c + z * s, y, -x * s + z * c];
};
const rotateX = ([x, y, z], deg) => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [x, y * c - z * s, y * s + z * c];
};
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

// Resolve the ink ramp once from the theme tokens (canvas cannot use CSS vars).
let rampCache = null;
function inkRamp() {
  if (rampCache) return rampCache;
  const style = getComputedStyle(document.documentElement);
  const token = (name, fallback) => style.getPropertyValue(`--color-${name}`).trim() || fallback;
  rampCache = {
    tones: INK_RAMP.map((t) => token(t, { 'ink-50': '#F5F5F6', 'ink-200': '#D8D8DB', 'ink-400': '#8A8A90', 'ink-700': '#2A2A2F', 'ink-800': '#1C1C20' }[t])),
    ink950: token('ink-950', '#0A0A0B'),
    ink50: token('ink-50', '#F5F5F6'),
  };
  return rampCache;
}

export function CanvasDie({ sides, value, settled, size = 112, prefersReduced = false }) {
  const canvasRef = useRef(null);
  const poseRef = useRef({ ...IDLE_POSE });

  // Render one frame for the given rotation (stable per sides/size).
  const draw = useCallback(
    (pose) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const px = Math.max(1, Math.round(size * dpr));
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const geom = GEOMETRY[sides];
      const normals = geom.faces.map((_, fi) => faceNormal(geom, fi));
      const rotated = geom.vertices.map((v) => rotateX(rotateY(v, pose.y), pose.x));

      const half = size / 2;
      const focal = 3.4 * half; // camera at z=3.4 model units; die radius = 1
      const project = (p) => {
        const s = focal / (focal - p[2] * half);
        return [half + p[0] * half * 0.86 * s, half - p[1] * half * 0.86 * s];
      };

      // Light direction, normalized.
      const ll = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
      const light = [LIGHT[0] / ll, LIGHT[1] / ll, LIGHT[2] / ll];
      const { tones, ink950, ink50 } = inkRamp();

      // Visible faces: normal·+Z > 0, with depth = mean z, painter-sorted
      // FAR → NEAR (far faces first, near faces painted over them).
      const visible = [];
      for (let fi = 0; fi < geom.faces.length; fi += 1) {
        const n = rotateX(rotateY(normals[fi], pose.y), pose.x);
        if (n[2] <= 0) continue;
        const pts = geom.faces[fi].map((vi) => rotated[vi]);
        const zAvg = pts.reduce((s, p) => s + p[2], 0) / pts.length;
        const intensity = Math.max(0, Math.min(1, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]));
        visible.push({ fi, zAvg, intensity, pts });
      }
      visible.sort((a, b) => a.zAvg - b.zAvg);

      ctx.lineWidth = 1;
      for (const face of visible) {
        const toneIndex = Math.round((1 - face.intensity) * (INK_RAMP.length - 1));
        const screen = face.pts.map(project);
        ctx.fillStyle = tones[toneIndex];
        ctx.beginPath();
        ctx.moveTo(screen[0][0], screen[0][1]);
        for (let i = 1; i < screen.length; i += 1) ctx.lineTo(screen[i][0], screen[i][1]);
        ctx.closePath();
        ctx.fill();
        // Hairline ink seam between facets — crisp flat-shaded faces, no blur.
        ctx.strokeStyle = 'rgba(10, 10, 11, 0.55)';
        ctx.stroke();
      }

      // Legible number on each face-on visible face (6/9 underlined).
      const fontSize = Math.max(7, Math.round(size * 0.26));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
      for (const face of visible) {
        const n = rotateX(rotateY(normals[face.fi], pose.y), pose.x);
        if (n[2] < NUMBER_FACE_DOT) continue;
        const cx = face.pts.reduce((s, p) => s + p[0], 0) / face.pts.length;
        const cy = face.pts.reduce((s, p) => s + p[1], 0) / face.pts.length;
        const [sx, sy] = project([cx, cy]);
        const valueOnFace = geom.faceNumbers[face.fi];
        const toneIndex = Math.round((1 - face.intensity) * (INK_RAMP.length - 1));
        ctx.fillStyle = toneIndex <= 2 ? ink950 : ink50;
        ctx.fillText(String(valueOnFace), sx, sy);
        if (valueOnFace === 6 || valueOnFace === 9) {
          const w = ctx.measureText(String(valueOnFace)).width;
          ctx.fillRect(sx - w / 2, sy + fontSize * 0.34, w, Math.max(1, Math.round(fontSize * 0.07)));
        }
      }

      // Soft contact shadow: grounds the die without a card surface.
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = ink950;
      ctx.beginPath();
      ctx.ellipse(half, half + size * 0.5, size * 0.32, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    [sides, size],
  );

  // Tumble on roll; idle otherwise. Deterministic path: start = the settle pose
  // minus its own extra turns (the base orientation), ease-out to the settle.
  useEffect(() => {
    const target = settled ? settleRotationFor(sides, value) : IDLE_POSE;
    const reduce = prefersReduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;

    if (!settled || reduce) {
      poseRef.current = target;
      draw(target);
      return undefined;
    }

    const turns = 2 + (value % 2);
    const start = { x: target.x - 360 * turns, y: target.y - 360 * turns };
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / TUMBLE_MS);
      const e = easeOutCubic(t);
      const pose = {
        x: start.x + (target.x - start.x) * e,
        y: start.y + (target.y - start.y) * e,
      };
      poseRef.current = pose;
      draw(pose);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [sides, value, settled, size, prefersReduced, draw]);

  // Keep the current pose crisp across resize / DPR changes — no perpetual rAF.
  useEffect(() => {
    const onResize = () => draw(poseRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="dice-canvas"
      style={{ width: size, height: size }}
    />
  );
}