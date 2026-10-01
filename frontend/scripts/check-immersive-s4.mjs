// Node structure checks for immersive-ui slice S4 (Login split-hero).
// Run: node scripts/check-immersive-s4.mjs  (exit 0 = all pass)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const login = readFileSync(join(root, 'src/pages/Login.jsx'), 'utf8');
const css = readFileSync(join(root, 'src/index.css'), 'utf8');

// --- IMM-H1 split-hero structure (Login.jsx) --------------------------------
check('Login 55/45 asymmetric grid', login.includes('grid-cols-[55fr_45fr]') || /grid-template-columns:\s*55fr\s+45fr/.test(css));
check('Login ≥2 z-layers', (login.match(/\bz-(0|10|20|30)\b/g) || []).length >= 3, 'need band z-0, numeral z-10, panel z-20');
check('Login z-0 band layer', login.includes('z-0'));
check('Login z-10 numeral layer', login.includes('z-10'));
check('Login z-20 panel layer', login.includes('z-20'));
check('Login overflow-hidden hero', login.includes('overflow-hidden'));
check('Login poster section aria-hidden', login.includes('aria-hidden="true"'));
check('Login outline numeral class', login.includes('login-numeral') && login.includes('text-outline'));
check('Login numeral glyph 20', /login-numeral[^>]*>\s*20\s*</.test(login) || login.includes('>20<'));
check('Login keeps shield icon', login.includes('<Shield'));
check('Login keeps user/lock icons', login.includes('<User') && login.includes('<Lock'));

// --- IMM-H1 outline helpers (index.css) --------------------------------------
check('CSS .text-outline helper', css.includes('.text-outline'));
check('CSS -webkit-text-stroke present', css.includes('-webkit-text-stroke: 1.5px var(--color-ink-50)'));
check('CSS transparent fill', /\.text-outline\s*{[^}]*color:\s*transparent/s.test(css));
check('CSS Safari pad-right advance fix', /\.text-outline\s*{[^}]*padding-right:\s*0\.08em/s.test(css));
check('CSS .login-numeral present', css.includes('.login-numeral'));
check('CSS numeral poster voice', css.includes('font-weight: 700') && css.includes('line-height: 0.85') && css.includes('letter-spacing: -0.04em'));

// --- IMM-H1 reflow ≤720px (index.css) ---------------------------------------
const mediaBlock = css.match(/@media \(max-width: 720px\)\s*{([\s\S]*?)\n}/);
check('CSS ≤720px media query present', !!mediaBlock, 'max-width: 720px');
check(
  'CSS ≤720px stacks to one column',
  !!mediaBlock && /grid-template-columns:\s*1fr/.test(mediaBlock[1]),
);
check(
  'CSS ≤720px margins reset (numeral left reset)',
  !!mediaBlock && /\.login-numeral\s*{[^}]*left:\s*0\.5rem/s.test(mediaBlock[1]),
);
check(
  'CSS ≤720px panel padding reset',
  !!mediaBlock && /\.login-panel\s*{[^}]*padding:/s.test(mediaBlock[1]),
);

// --- contrast: only existing ink/brand tokens, no new hex colors ------------
const ALLOWED_HEX = new Set([
  '#0a0a0b', // ink-950
  '#111113', // ink-900
  '#1c1c20', // ink-800
  '#2a2a2f', // ink-700
  '#8a8a90', // ink-400
  '#d8d8db', // ink-200
  '#f5f5f6', // ink-50
  '#ff4f45', // signal-500
  '#e03a31', // signal-600
]);
const hexes = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
check('CSS only existing token hex values', hexes.every((h) => ALLOWED_HEX.has(h)), [...new Set(hexes)].join(', '));
check('CSS numeral uses ink-50 stroke token', css.includes('var(--color-ink-50)'));
check('CSS band uses ink-900/ink-800 only', css.includes('var(--color-ink-900)') && css.includes('var(--color-ink-800)'));

// --- Spanish copy preserved (Login.jsx) --------------------------------------
const SPANISH = [
  'Mesa de Rol - D&D',
  'Ingresa a tu cuenta de jugador',
  'Nombre de Usuario',
  'Nombre de aventurero',
  'Contraseña',
  'Entrar a la Campaña',
  '¿Nuevo en la mesa?',
  'Crear usuario',
  'Usuario o contraseña incorrectos',
];
SPANISH.forEach((s) => check(`Spanish copy: "${s}"`, login.includes(s)));

// --- presentation-only (no logic drift) --------------------------------------
check('Login handler unchanged', login.includes('handleLogin') && login.includes('signInWithPassword'));
check('Login no framer-motion import', !login.includes('framer-motion'));
check('Login no spring', !login.includes("type: 'spring'"));
check('Login no new state', (login.match(/useState\(/g) || []).length === 3, 'username/password/error only');

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

console.log(`${pass}/${pass + fail} PASS`);
process.exit(fail === 0 ? 0 : 1);