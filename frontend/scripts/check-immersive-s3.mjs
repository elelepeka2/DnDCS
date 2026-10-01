// Node determinism/structure checks for immersive-ui slice S3 (PseudoDie tier).
// Run: node scripts/check-immersive-s3.mjs  (exit 0 = all pass)
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

const extraTurns = (v) => 360 * (2 + (v % 2));
const reduce = (deg) => ((deg % 360) + 360) % 360;
const toBounded = (deg) => (reduce(deg) > 180 ? reduce(deg) - 360 : reduce(deg));

// --- d10/d12/d20: value-keyed tilt tables + repeat determinism --------------
const PSEUDO = {
  10: { step: 4, start: -18 },
  12: { step: 3, start: -17 },
  20: { step: 2, start: -19 },
};
for (const [sidesStr, { step, start }] of Object.entries(PSEUDO)) {
  const sides = Number(sidesStr);
  const seen = new Set();
  for (let v = 1; v <= sides; v += 1) {
    const a = orientationFor(sides, v);
    const b = orientationFor(sides, v);
    const ex = (v % 2 ? 8 : -8) + extraTurns(v);
    const ey = start + step * (v - 1) + extraTurns(v);
    check(`d${sides} v${v} exact tilt table`, a.x === ex && a.y === ey, JSON.stringify(a));
    check(`d${sides} v${v} repeat identical`, JSON.stringify(a) === JSON.stringify(b));
    const bx = Math.abs(toBounded(a.x));
    const by = Math.abs(toBounded(a.y));
    check(`d${sides} v${v} bounded tilt (|x|≤8, |y|≤19)`, bx <= 8 && by <= 19, `(${bx}, ${by})`);
    seen.add(`${reduce(a.x)}|${reduce(a.y)}`);
  }
  check(`d${sides} ${sides} distinct settle poses`, seen.size === sides, `got ${seen.size}`);
  check(`d${sides} clamp low`, JSON.stringify(orientationFor(sides, 0)) === JSON.stringify(orientationFor(sides, 1)));
  check(`d${sides} clamp high`, JSON.stringify(orientationFor(sides, 99)) === JSON.stringify(orientationFor(sides, sides)));
}

// --- S2 regressions: d4/d8 exact + d6 settle map byte-preserved -------------
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
for (let v = 1; v <= 8; v += 1) {
  const seat = FACE_SEATS[8][v - 1];
  const a = orientationFor(8, v);
  const b = orientationFor(8, v);
  const ex = -seat.elev + extraTurns(v);
  const ey = seat.psi - 90 + extraTurns(v);
  check(`d8 v${v} exact inverse seat`, a.x === ex && a.y === ey, JSON.stringify(a));
  check(`d8 v${v} repeat identical`, JSON.stringify(a) === JSON.stringify(b));
}

// --- S1 regressions ---------------------------------------------------------
const rolled = rollDice(3, 6, 2);
check('rollDice 3d6+2 shape', rolled.count === 3 && rolled.values.length === 3 && rolled.total === rolled.values.reduce((s, v) => s + v, 0) + 2);
check('chip format', formatChip({ count: 3, sides: 6, values: [4, 5, 6], modifier: 2 }) === '3d6+2 = 17');
check('legacy int entry', JSON.stringify(normalizeRollEntry(4)) === JSON.stringify({ count: 1, sides: 6, values: [4], modifier: 0 }));

// --- PseudoDie source structure (JSX is not importable in node) -------------
const pseudoDie = readFileSync(join(root, 'src/components/ui/dice/PseudoDie.jsx'), 'utf8');
check('PseudoDie imports engine orientation', pseudoDie.includes("from '../../../dice/rollDice'") && pseudoDie.includes('orientationFor'));
check('PseudoDie inlined silhouette tables', pseudoDie.includes('SILHOUETTES') && (pseudoDie.match(/polygon\(/g) || []).length >= 12);
check('PseudoDie facet gradients', (pseudoDie.match(/linear-gradient\(/g) || []).length >= 3);
check('PseudoDie static clip-path (never animated)', !pseudoDie.includes('animate={{ clipPath') && !pseudoDie.includes('whileHover={{ clipPath'));
check('PseudoDie transform-only tilt', pseudoDie.includes('whileHover'));
check('PseudoDie no spring (only TrueDie has the sanctioned one)', !pseudoDie.includes("type: 'spring'"));
check('PseudoDie 6/9 underline rule', pseudoDie.includes('value === 6 || value === 9') && pseudoDie.includes('textDecorationLine'));
check('PseudoDie renders rolled number', pseudoDie.includes('{value}'));
const pseudoImports = pseudoDie.match(/from ['"][^'"]+['"]/g) || [];
check('PseudoDie imports only framer-motion + engine', pseudoImports.length === 2 && pseudoImports.every((i) => i.includes('framer-motion') || i.includes('dice/rollDice')), pseudoImports.join(', '));

// --- RollPanel wiring --------------------------------------------------------
const rollPanel = readFileSync(join(root, 'src/components/ui/RollPanel.jsx'), 'utf8');
check('RollPanel imports PseudoDie', rollPanel.includes("from './dice/PseudoDie'") && rollPanel.includes('<PseudoDie'));
check('RollPanel pseudo tier count===1 gate', rollPanel.includes('PSEUDO_TIER') && rollPanel.includes('count === 1'));
check('RollPanel TrueDie wiring kept', rollPanel.includes('<TrueDie') && rollPanel.includes('TRUE_TIER'));
check('RollPanel no new spring', !rollPanel.includes("type: 'spring'"));
check('RollPanel Spanish copy kept', ['Tipo de dado', 'Cantidad', 'Modificador', 'Historial'].every((s) => rollPanel.includes(s)));

// --- restraint gates --------------------------------------------------------
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