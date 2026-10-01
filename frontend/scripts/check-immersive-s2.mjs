// Node determinism/structure checks for immersive-ui slice S2 (TrueDie tier).
// Run: node scripts/check-immersive-s2.mjs  (exit 0 = all pass)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FACE_SEATS,
  formatChip,
  normalizeRollEntry,
  orientationFor,
  rollDice,
} from '../src/dice/rollDice.js';

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

// --- d4: value-keyed spin table + repeat determinism -----------------------
const D4_Y = { 1: 0, 2: 90, 3: 180, 4: 270 };
for (let v = 1; v <= 4; v += 1) {
  const a = orientationFor(4, v);
  const b = orientationFor(4, v);
  check(`d4 v${v} exact`, a.x === extraTurns(v) && a.y === D4_Y[v] + extraTurns(v), JSON.stringify(a));
  check(`d4 v${v} repeat identical`, JSON.stringify(a) === JSON.stringify(b));
}

// --- d6: regression — settle map preserved byte-for-byte from S1 ----------
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

// --- d8: settle = inverse of build seat; repeat + uniqueness ---------------
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

// --- settle geometry: face n ends dead-front under rotateX(x) rotateY(y) ---
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

// --- seat data sanity ------------------------------------------------------
const D4_PSI = [90, 210, 330];
check('d4 three standing seats', FACE_SEATS[4].length === 3);
FACE_SEATS[4].forEach((s, i) => {
  check(`d4 seat ${i} psi`, s.psi === D4_PSI[i]);
  check(`d4 seat ${i} elev = asin(1/3)`, near(s.elev, (Math.asin(1 / 3) / RAD), 1e-3), String(s.elev));
});
check('d8 eight seats', FACE_SEATS[8].length === 8);
FACE_SEATS[8].forEach((s, i) => {
  check(`d8 seat ${i} elev = asin(1/√3)`, near(Math.abs(s.elev), Math.asin(1 / Math.sqrt(3)) / RAD, 1e-3), String(s.elev));
  check(`d8 seat ${i} psi on ring`, [45, 135, 225, 315].includes(s.psi), String(s.psi));
});
// d4 idle rest: seat ψ=90 stands dead-front, tilted up by asin(1/3)
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

// --- clamps + S1 regressions ----------------------------------------------
check('d4 clamp low', JSON.stringify(orientationFor(4, 0)) === JSON.stringify(orientationFor(4, 1)));
check('d8 clamp high', JSON.stringify(orientationFor(8, 99)) === JSON.stringify(orientationFor(8, 8)));
const rolled = rollDice(3, 6, 2);
check('rollDice 3d6+2 shape', rolled.count === 3 && rolled.values.length === 3 && rolled.total === rolled.values.reduce((s, v) => s + v, 0) + 2);
check('chip format', formatChip({ count: 3, sides: 6, values: [4, 5, 6], modifier: 2 }) === '3d6+2 = 17');
check('legacy int entry', JSON.stringify(normalizeRollEntry(4)) === JSON.stringify({ count: 1, sides: 6, values: [4], modifier: 0 }));

// --- TrueDie source structure (JSX is not importable in node) -------------
const trueDie = readFileSync(join(root, 'src/components/ui/dice/TrueDie.jsx'), 'utf8');
check('TrueDie imports engine seats', trueDie.includes("from '../../../dice/rollDice'") && trueDie.includes('FACE_SEATS') && trueDie.includes('orientationFor'));
check('TrueDie preserve-3d', trueDie.includes('preserve-3d'));
check('TrueDie rounded faces', trueDie.includes('borderRadius'));
check('TrueDie triangle clips', (trueDie.match(/polygon\(/g) || []).length >= 2);
check('TrueDie 6/9 underline rule', trueDie.includes('value === 6 || value === 9') && trueDie.includes('textDecorationLine'));
check('TrueDie numbers not pips', !trueDie.includes('PIPS') && !trueDie.includes('hasPip') && !trueDie.includes('rounded-full'));
check('TrueDie single sanctioned spring', (trueDie.match(/type: 'spring', stiffness: 220, damping: 18/g) || []).length === 1);

// --- RollPanel wiring ------------------------------------------------------
const rollPanel = readFileSync(join(root, 'src/components/ui/RollPanel.jsx'), 'utf8');
check('RollPanel imports TrueDie', rollPanel.includes("from './dice/TrueDie'") && rollPanel.includes('<TrueDie'));
check('RollPanel interim cube removed', !rollPanel.includes('DieFace') && !rollPanel.includes('FACE_TRANSFORMS') && !rollPanel.includes('PIPS'));
check('RollPanel spring moved out', !rollPanel.includes("type: 'spring'"));
check('RollPanel Spanish copy kept', ['Tipo de dado', 'Cantidad', 'Modificador', 'Historial'].every((s) => rollPanel.includes(s)));

// --- restraint gates -------------------------------------------------------
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

console.log(`${pass}/${pass + fail} PASS`);
process.exit(fail === 0 ? 0 : 1);
