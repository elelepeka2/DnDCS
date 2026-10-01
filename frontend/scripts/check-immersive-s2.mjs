// Node determinism/structure checks for immersive-ui slice S2 (CanvasDie tier).
// Run: node scripts/check-immersive-s2.mjs  (exit 0 = all pass)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FACE_SEATS,
  formatChip,
  normalizeRollEntry,
  orientationFor,
  rollDice,
} from '../src/dice/rollDice.js';
import { GEOMETRY, faceNormal, settleRotationFor } from '../src/components/ui/dice/diceGeometry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) pass += 1;
  else {
    fail += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const RAD = Math.PI / 180;
const extraTurns = (v) => 360 * (2 + (v % 2));
const rotX = ([x, y, z], deg) => {
  const r = deg * RAD;
  return [x, y * Math.cos(r) - z * Math.sin(r), y * Math.sin(r) + z * Math.cos(r)];
};
const rotY = ([x, y, z], deg) => {
  const r = deg * RAD;
  return [x * Math.cos(r) + z * Math.sin(r), y, -x * Math.sin(r) + z * Math.cos(r)];
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// --- S1/S2 engine regressions: orientationFor tables preserved byte-exact ----
const D4_Y = { 1: 0, 2: 90, 3: 180, 4: 270 };
for (let v = 1; v <= 4; v += 1) {
  const a = orientationFor(4, v);
  const b = orientationFor(4, v);
  check(`d4 v${v} exact`, a.x === extraTurns(v) && a.y === D4_Y[v] + extraTurns(v), JSON.stringify(a));
  check(`d4 v${v} repeat identical`, JSON.stringify(a) === JSON.stringify(b));
}
const D6 = {
  1: [1080, 1080],
  2: [720, 630],
  3: [990, 1080],
  4: [810, 720],
  5: [1080, 1170],
  6: [720, 900],
};
for (const [v, [x, y]] of Object.entries(D6)) {
  const o = orientationFor(6, Number(v));
  check(`d6 v${v} settle preserved`, o.x === x && o.y === y, JSON.stringify(o));
}
const seen = new Set();
for (let v = 1; v <= 8; v += 1) {
  const seat = FACE_SEATS[8][v - 1];
  const a = orientationFor(8, v);
  const b = orientationFor(8, v);
  const ex = -seat.elev + extraTurns(v);
  const ey = seat.psi - 90 + extraTurns(v);
  check(`d8 v${v} exact inverse seat`, a.x === ex && a.y === ey, JSON.stringify(a));
  check(`d8 v${v} repeat identical`, JSON.stringify(a) === JSON.stringify(b));
  seen.add(`${((a.x % 360) + 360) % 360}|${((a.y % 360) + 360) % 360}`);
}
check('d8 eight distinct settle poses', seen.size === 8, `got ${seen.size}`);
for (let v = 1; v <= 8; v += 1) {
  const { psi, elev } = FACE_SEATS[8][v - 1];
  const phi = 90 - psi;
  const n0 = [
    Math.cos(elev * RAD) * Math.sin(phi * RAD),
    -Math.sin(elev * RAD),
    Math.cos(elev * RAD) * Math.cos(phi * RAD),
  ];
  const { x, y } = orientationFor(8, v);
  const n = rotX(rotY(n0, y), x);
  check(
    `d8 v${v} face points at camera`,
    near(n[0], 0, 2e-4) && near(n[1], 0, 2e-4) && near(n[2], 1, 2e-4),
    `[${n.map((c) => c.toFixed(5)).join(', ')}]`,
  );
}
const D4_PSI = [90, 210, 330];
check('d4 three standing seats', FACE_SEATS[4].length === 3);
FACE_SEATS[4].forEach((s, i) => {
  check(`d4 seat ${i} psi`, s.psi === D4_PSI[i]);
  check(`d4 seat ${i} elev = asin(1/3)`, near(s.elev, Math.asin(1 / 3) / RAD, 1e-3), String(s.elev));
});
check('d8 eight seats', FACE_SEATS[8].length === 8);
FACE_SEATS[8].forEach((s, i) => {
  check(`d8 seat ${i} elev = asin(1/√3)`, near(Math.abs(s.elev), Math.asin(1 / Math.sqrt(3)) / RAD, 1e-3), String(s.elev));
  check(`d8 seat ${i} psi on ring`, [45, 135, 225, 315].includes(s.psi), String(s.psi));
});
{
  const { psi, elev } = FACE_SEATS[4][0];
  const phi = 90 - psi;
  const n0 = [
    Math.cos(elev * RAD) * Math.sin(phi * RAD),
    -Math.sin(elev * RAD),
    Math.cos(elev * RAD) * Math.cos(phi * RAD),
  ];
  const az = (Math.atan2(n0[2], n0[0]) / RAD + 360) % 360;
  const tilt = Math.asin(-n0[1]) / RAD;
  check('d4 idle front seat azimuth 90°', near(az, 90, 1e-6), String(az));
  check('d4 idle front seat tilt', near(tilt, Math.asin(1 / 3) / RAD, 1e-3), String(tilt));
}
check('d4 clamp low', JSON.stringify(orientationFor(4, 0)) === JSON.stringify(orientationFor(4, 1)));
check('d8 clamp high', JSON.stringify(orientationFor(8, 99)) === JSON.stringify(orientationFor(8, 8)));
const rolled = rollDice(3, 6, 2);
check('rollDice 3d6+2 shape', rolled.count === 3 && rolled.values.length === 3 && rolled.total === rolled.values.reduce((s, v) => s + v, 0) + 2);
check('chip format', formatChip({ count: 3, sides: 6, values: [4, 5, 6], modifier: 2 }) === '3d6+2 = 17');
check('legacy int entry', JSON.stringify(normalizeRollEntry(4)) === JSON.stringify({ count: 1, sides: 6, values: [4], modifier: 0 }));

// --- CanvasDie geometry validity: closed solids, numbering, opposites --------
const SOLIDS = [4, 6, 8, 10, 12, 20];
const FACE_SIZE = { 4: 3, 6: 4, 8: 3, 10: 4, 12: 5, 20: 3 };
for (const sides of SOLIDS) {
  const g = GEOMETRY[sides];
  check(
    `d${sides} geometry present`,
    !!g && Array.isArray(g.vertices) && Array.isArray(g.faces) && Array.isArray(g.faceNumbers),
  );
  check(`d${sides} face sizes`, g.faces.every((f) => f.length === FACE_SIZE[sides]));
  check(
    `d${sides} numbered 1..${sides} exactly once`,
    JSON.stringify([...g.faceNumbers].sort((a, b) => a - b)) ===
      JSON.stringify(Array.from({ length: sides }, (_, i) => i + 1)),
  );
  check(`d${sides} vertex indices in range`, g.faces.every((f) => f.every((vi) => vi >= 0 && vi < g.vertices.length)));
  const radii = g.vertices.map((v) => Math.hypot(v[0], v[1], v[2]));
  check(
    `d${sides} vertices on shell (radius 0.5..1.02)`,
    radii.every((r) => r >= 0.5 && r <= 1.02),
    radii.map((r) => r.toFixed(3)).join(','),
  );
  const ec = new Map();
  for (const f of g.faces) {
    for (let i = 0; i < f.length; i += 1) {
      const a = f[i];
      const b = f[(i + 1) % f.length];
      const k = a < b ? `${a}:${b}` : `${b}:${a}`;
      ec.set(k, (ec.get(k) || 0) + 1);
    }
  }
  check(`d${sides} closed solid (each edge exactly 2 faces)`, [...ec.values()].every((n) => n === 2));
  const c = g.vertices.reduce((acc, v) => [acc[0] + v[0] / g.vertices.length, acc[1] + v[1] / g.vertices.length, acc[2] + v[2] / g.vertices.length], [0, 0, 0]);
  const outward = g.faces.every((f, fi) => {
    const n = faceNormal(g, fi);
    const fc = f.reduce((acc, vi) => [acc[0] + g.vertices[vi][0] / f.length, acc[1] + g.vertices[vi][1] / f.length, acc[2] + g.vertices[vi][2] / f.length], [0, 0, 0]);
    return dot(n, sub(fc, c)) > 0;
  });
  check(`d${sides} faces wound outward`, outward);
  const planar = g.faces.every((f) => {
    const [p0, p1, p2] = f.slice(0, 3).map((vi) => g.vertices[vi]);
    const nn = cross(sub(p1, p0), sub(p2, p0));
    return f.slice(3).every((vi) => Math.abs(dot(nn, sub(g.vertices[vi], p0))) < 1e-6);
  });
  check(`d${sides} faces planar`, planar);
}

// --- standard numbering: opposite faces sum to sides+1 (d6/d8/d10/d12/d20) ---
const OPP_SUMS = { 6: 7, 8: 9, 10: 11, 12: 13, 20: 21 };
for (const [sidesStr, sum] of Object.entries(OPP_SUMS)) {
  const sides = Number(sidesStr);
  const g = GEOMETRY[sides];
  const normals = g.faces.map((_, fi) => faceNormal(g, fi));
  let ok = true;
  for (let i = 0; i < g.faces.length; i += 1) {
    const opp = normals.findIndex((n, j) => j !== i && dot(n, normals[i]) < -0.999);
    if (opp === -1 || g.faceNumbers[i] + g.faceNumbers[opp] !== sum) {
      ok = false;
      break;
    }
  }
  check(`d${sides} opposite faces sum ${sum}`, ok);
}

// --- settle determinism: same value ⇒ same pose, distinct values distinct ---
for (const sides of SOLIDS) {
  const g = GEOMETRY[sides];
  const seenPoses = new Set();
  let distinct = true;
  for (let v = 1; v <= sides; v += 1) {
    const a = settleRotationFor(sides, v);
    const b = settleRotationFor(sides, v);
    check(`d${sides} v${v} settle deterministic`, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a));
    const key = `${((a.x % 360) + 360) % 360}|${((a.y % 360) + 360) % 360}`;
    if (seenPoses.has(key)) distinct = false;
    seenPoses.add(key);
    const n = faceNormal(g, g.faceNumbers.indexOf(v));
    const r = rotX(rotY(n, a.y), a.x);
    check(
      `d${sides} v${v} face points at camera`,
      near(r[0], 0, 2e-4) && near(r[1], 0, 2e-4) && near(r[2], 1, 2e-4),
      `[${r.map((c) => c.toFixed(5)).join(', ')}]`,
    );
  }
  check(`d${sides} ${sides} distinct settle poses`, distinct, `got ${seenPoses.size}/${sides}`);
  check(`d${sides} clamp low`, JSON.stringify(settleRotationFor(sides, 0)) === JSON.stringify(settleRotationFor(sides, 1)));
  check(`d${sides} clamp high`, JSON.stringify(settleRotationFor(sides, 99)) === JSON.stringify(settleRotationFor(sides, sides)));
}

// --- CanvasDie source structure (JSX is not importable in node) --------------
const canvasDie = readFileSync(join(root, 'src/components/ui/dice/CanvasDie.jsx'), 'utf8');
check('CanvasDie imports pure geometry', canvasDie.includes("from './diceGeometry'") && canvasDie.includes('GEOMETRY') && canvasDie.includes('settleRotationFor'));
check('CanvasDie renders <canvas> with 2D context', canvasDie.includes('<canvas') && canvasDie.includes("getContext('2d'"));
check('CanvasDie rAF tumble', canvasDie.includes('requestAnimationFrame'));
check('CanvasDie devicePixelRatio scaling', canvasDie.includes('devicePixelRatio'));
check('CanvasDie aria-hidden', canvasDie.includes('aria-hidden="true"'));
check('CanvasDie 6/9 underline rule', canvasDie.includes('=== 6 ||') && canvasDie.includes('=== 9'));
check('CanvasDie reduced-motion gate', canvasDie.includes('prefers-reduced-motion'));
check('CanvasDie idle after settle (no perpetual rAF)', canvasDie.includes('return () => cancelAnimationFrame(raf)'));
check('CanvasDie no spring', !canvasDie.includes("type: 'spring'"));
const cdCode = canvasDie.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
check('CanvasDie no WebGL/three', !/three|WebGL|webgl|spline/.test(cdCode));
const cdImports = canvasDie.match(/from ['"][^'"]+['"]/g) || [];
check(
  'CanvasDie imports only react + diceGeometry',
  cdImports.length === 2 && cdImports.every((i) => i.includes('react') || i.includes('diceGeometry')),
  cdImports.join(', '),
);
const tumbleMatch = canvasDie.match(/TUMBLE_MS = (\d+)/);
check(
  'CanvasDie tumble duration 600–900ms',
  !!tumbleMatch && Number(tumbleMatch[1]) >= 600 && Number(tumbleMatch[1]) <= 900,
  tumbleMatch ? `TUMBLE_MS = ${tumbleMatch[1]}` : 'missing',
);

// --- RollPanel wiring --------------------------------------------------------
const rollPanel = readFileSync(join(root, 'src/components/ui/RollPanel.jsx'), 'utf8');
check('RollPanel imports CanvasDie', rollPanel.includes("from './dice/CanvasDie'") && rollPanel.includes('<CanvasDie'));
check('RollPanel no TrueDie/PseudoDie', !rollPanel.includes('TrueDie') && !rollPanel.includes('PseudoDie'));
check('RollPanel hero 112px / compact 40px tier', rollPanel.includes('size={count === 1 ? 112 : 40}'));
check('RollPanel Spanish copy kept', ['Tipo de dado', 'Cantidad', 'Modificador', 'Historial'].every((s) => rollPanel.includes(s)));
check(
  'RollPanel sanctioned spring (the only one)',
  (rollPanel.match(/type: 'spring', stiffness: 220, damping: 18/g) || []).length === 1,
);

// --- old renderers removed ---------------------------------------------------
check('TrueDie deleted', !existsSync(join(root, 'src/components/ui/dice/TrueDie.jsx')));
check('PseudoDie deleted', !existsSync(join(root, 'src/components/ui/dice/PseudoDie.jsx')));

// --- restraint gates ---------------------------------------------------------
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const srcFiles = walk(join(root, 'src')).filter((p) => /\.(jsx?|mjs)$/.test(p));
const springs = srcFiles.reduce(
  (n, p) => n + (readFileSync(p, 'utf8').match(/type: 'spring'/g) || []).length,
  0,
);
check('exactly one type:spring over src/', springs === 1, `got ${springs}`);
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
check('no gnuton|three|spline dependency', !/gnuton|three|spline/.test(pkg));
check(
  'NoWebGL: no three import / THREE global in src',
  !srcFiles.some((p) => /from ['"]three['"]|THREE\.|new THREE|spline/.test(readFileSync(p, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''))),
);
check(
  'requestAnimationFrame only in CanvasDie/Particles/AmbientLayer',
  srcFiles.every((p) => {
    if (p.endsWith('CanvasDie.jsx') || p.endsWith('Particles.jsx') || p.endsWith('AmbientLayer.jsx')) return true;
    return !readFileSync(p, 'utf8').includes('requestAnimationFrame');
  }),
);

console.log(`${pass}/${pass + fail} PASS`);
process.exit(fail === 0 ? 0 : 1);