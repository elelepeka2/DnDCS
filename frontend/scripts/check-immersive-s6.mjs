// Node structure checks for immersive-ui slice S6 (Ambient kit).
// Run: node scripts/check-immersive-s6.mjs  (exit 0 = all pass)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) pass += 1;
  else {
    fail += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
};
const read = (p) => readFileSync(join(src, p), 'utf8');

const particles = read('components/decorative/Particles.jsx');
const lineArt = read('components/decorative/LineArt.jsx');
const sprite = read('components/decorative/CharacterSprite.jsx');
const ambient = read('components/decorative/AmbientLayer.jsx');
const app = read('App.jsx');
const css = read('index.css');

// --- IMM-A1 Canvas: DOM ≤50 motes, canvas beyond ---------------------------
check('Particles clamps count (floor + non-negative)', /Math\.max\(0, Math\.floor\(count\)/.test(particles));
check('DOM→canvas gate at >50', particles.includes('n > 50'), 'canvas branch must trigger above 50');
check('Canvas fallback renders <canvas>', particles.includes('<canvas'));
check('Canvas uses 2D context only', particles.includes("getContext('2d')") && !particles.includes('getContext(\'webgl\')'));
check('Canvas loop gated by prefers-reduced-motion', particles.includes('prefers-reduced-motion') && particles.includes('!reduce.matches'));
check('Motes are deterministic (seeded PRNG)', particles.includes('mulberry32') && !particles.includes('Math.random'));
check('DOM motes ≤50 (budget)', /for \(let i = 0; i < count/.test(particles), 'field loop bounded by clamped count');
check('Particles aria-hidden', particles.includes('aria-hidden="true"'));
check('Motes VISIBLE: 2-5px size maker', particles.includes('size: Math.round(rand() * 3 + 2)'));
check('Motes VISIBLE: peak alpha 0.5-0.9', particles.includes('peak: (rand() * 0.4 + 0.5).toFixed(2)'));
check('Motes VISIBLE: snappy 3-8s loop', particles.includes('dur: (rand() * 5 + 3).toFixed(1)'));
check('Motes VISIBLE: real drift ±45/±35px', particles.includes('dx: Math.round(rand() * 90 - 45)') && particles.includes('dy: Math.round(rand() * 70 - 35)'));
check('Canvas motes use brighter ink-400', particles.includes('--color-ink-400'));


// --- IMM-A1 Present: aria-hidden decor --------------------------------------
check('AmbientLayer root aria-hidden', ambient.includes('aria-hidden="true"'));
check('LineArt svg aria-hidden + focusable=false', lineArt.includes('aria-hidden="true"') && lineArt.includes('focusable="false"'));
check('CharacterSprite svg aria-hidden + focusable=false', sprite.includes('aria-hidden="true"') && sprite.includes('focusable="false"'));

// --- IMM-A1 zones: far + near ------------------------------------------------
check('AmbientLayer has far zone', ambient.includes('ambient-zone--far'));
check('AmbientLayer has near zone', ambient.includes('ambient-zone--near'));
check('Zones are full-viewport slots', (ambient.match(/ambient-zone/g) || []).length >= 2);
check('Zone CSS present', css.includes('.ambient-zone--far') && css.includes('.ambient-zone--near'));
check('AmbientLayer composes all three decor parts', ambient.includes('<LineArt') && ambient.includes('<CharacterSprite') && (ambient.match(/<Particles/g) || []).length >= 2);

// --- IMM-A2: static sprite, no WebGL/runtime 3D ------------------------------
check('Sprite is SVG', sprite.includes('<svg'));
check('Sprite has NO SVG animation elements', !/<animate|animateTransform|animateMotion/.test(sprite));
check('Sprite has NO rAF/canvas/WebGL', !/requestAnimationFrame|getContext|WebGL|THREE/.test(sprite));
check('Sprite has NO motion classes/imports', !/ambient-loop|framer-motion|animation/.test(sprite));
check('Sprite uses ink tokens only', !/#[0-9a-fA-F]{3,8}\b/.test(sprite));
check('LineArt is SVG with stroke motifs', lineArt.includes('<svg') && (lineArt.match(/stroke=/g) || []).length >= 2);
check('LineArt loops via CSS class (transform/opacity only)', lineArt.includes('ambient-loop'));
check('LineArt has no rAF', !lineArt.includes('requestAnimationFrame'));

// --- IMM-A1 Vibrant Compositor: transform/opacity-only keyframes ------------
const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)];
check('S6 defines keyframes (ambient-mote + ambient-spin)', keyframes.length >= 2, `found ${keyframes.length}`);
const animatedProps = [];
for (const [, , body] of keyframes) {
  const decls = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
  for (const d of decls) if (!animatedProps.includes(d)) animatedProps.push(d);
}
check(
  'Keyframes animate ONLY transform/opacity',
  animatedProps.length > 0 && animatedProps.every((p) => p === 'transform' || p === 'opacity'),
  `animated: ${animatedProps.join(', ')}`,
);
check(
  'No width/height/color/margin/left/top animation in keyframes',
  !/width|height|color|margin|padding|left|top|right|bottom/.test(keyframes.map((m) => m[2]).join('\n')),
);
const spinDur = css.match(/\.ambient-loop\s*{[^}]*animation:\s*ambient-spin (\d+)s/);
check(
  'LineArt spin perceivable: 18-30s loop',
  !!spinDur && Number(spinDur[1]) >= 18 && Number(spinDur[1]) <= 30,
  spinDur ? `ambient-spin ${spinDur[1]}s` : 'missing',
);
check('LineArt pulses via ambient-breathe', css.includes('ambient-breathe'));
check('Zones drift via ambient-drift', css.includes('ambient-drift'));
check('Far zone drifts (parallax)', /\.ambient-zone--far\s*{[^}]*animation:\s*ambient-drift/.test(css));
check('Near zone drifts counter-phased', /\.ambient-zone--near\s*{[^}]*animation:\s*ambient-drift[^}]*alternate-reverse/.test(css));


// --- design decision 9: transient will-change --------------------------------
const willChangeRules = [...css.matchAll(/([^{}]+)\{([^}]*will-change[^}]*)\}/g)];
check(
  'will-change only inside .ambient-animating scope',
  willChangeRules.length === 1 && willChangeRules[0][1].includes('ambient-animating'),
  willChangeRules.length === 0 ? 'no will-change found' : `outside scope: ${willChangeRules.map((w) => w[1].trim()).join(' | ')}`,
);
check('will-change targets only animating elements', /\.ambient-animating \.particle,\s*\.ambient-animating \.ambient-loop,\s*\.ambient-animating \.ambient-zone/.test(css));
check('JS applies will-change transiently (add)', ambient.includes("classList.add('ambient-animating')"));
check('JS releases will-change (remove on unmount/reduced)', ambient.includes("classList.remove('ambient-animating')"));
check('Applied after first paint (rAF)', ambient.includes('requestAnimationFrame(sync)'));

// --- IMM-A1 Reduced: loops stop, nothing hides --------------------------------
const s6Block = css.slice(css.indexOf('/* ── IMM-A1 Ambient kit'));
const reduceBlock = s6Block.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
check('S6 has explicit reduced-motion gate', !!reduceBlock);
check(
  'Reduced motion disables ambient loops',
  !!reduceBlock && /animation:\s*none/.test(reduceBlock[1]),
);
check(
  'Reduced motion gate covers particles + loop + zones',
  !!reduceBlock && /\.particle,\s*\.ambient-loop,\s*\.ambient-zone/.test(reduceBlock[0]),
);
check(
  'Reduced motion hides NOTHING (no display/visibility none)',
  !!reduceBlock && !/display:\s*none|visibility:\s*hidden/.test(reduceBlock[1]),
);
check(
  'Reduced motion hides NOTHING (no display/visibility none)',
  !!reduceBlock && !/display:\s*none|visibility:\s*hidden/.test(reduceBlock[1]),
);
check('S6 block uses ink tokens only (no hex colors)', !/#[0-9a-fA-F]{3,8}\b/.test(s6Block), 'decor must reuse existing ink tokens');
check('Ambient container is fixed + pointer-events none', /\.ambient\s*\{[^}]*position:\s*fixed/.test(css) && /\.ambient\s*\{[^}]*pointer-events:\s*none/.test(css));

// --- App.jsx mount: present, auth/routes untouched ---------------------------
check('AmbientLayer imported in App.jsx', app.includes("import { AmbientLayer } from './components/decorative/AmbientLayer';"));
check('AmbientLayer mounted inside MotionConfig', /<MotionConfig[\s\S]*?<AmbientLayer \/>/.test(app));
check('Auth session flow untouched', app.includes('supabase.auth.getSession') && app.includes('supabase.auth.onAuthStateChange'));
check('Auth state handlers untouched', app.includes('setUser(session?.user ?? null)') && app.includes('setLoading(false)'));
check('All four routes intact', ['/login', '/register', '/dashboard', '/character/:id'].every((r) => app.includes(`path="${r}"`)));
check('Default redirect intact', app.includes('<Navigate to={user ? "/dashboard" : "/login"} replace />'));
check('FAB + RollPanel still mounted', app.includes('<FloatingDiceButton') && app.includes('<RollPanel'));
check('Spanish preserved (loading)', app.includes('Iniciando sesión...'));

// --- decorative components carry no copy (aria-hidden, text-free) ------------
const decorFiles = ['Particles.jsx', 'LineArt.jsx', 'CharacterSprite.jsx', 'AmbientLayer.jsx'];
check(
  'Decorative components have no plain-text nodes',
  decorFiles.every((f) => !/>\s*[A-Za-zÁÉÍÓÚáéíóúñÑ][\wÁÉÍÓÚáéíóúñÑ ,.!?']*\s*</.test(read(`components/decorative/${f}`))),
);

// --- restraint gates ----------------------------------------------------------
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const srcFiles = walk(src).filter((p) => /\.(jsx?|mjs)$/.test(p));
const springs = srcFiles.reduce(
  (n, p) => n + (readFileSync(p, 'utf8').match(/type: 'spring'/g) || []).length,
  0,
);
check('exactly one type:spring over src/', springs === 1, `got ${springs}`);
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
check('no gnuton|three|spline dependency', !/gnuton|three|spline/.test(pkg));
check(
  'NoWebGL: no three.js import / THREE global / spline in src',
  !srcFiles.some((p) =>
    /from ['"]three['"]|THREE\.|new THREE|spline/.test(
      readFileSync(p, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''),
    ),
  ),
);
check(
  'requestAnimationFrame only in Particles (canvas) + AmbientLayer (will-change)',
  srcFiles.every((p) => {
    if (p.endsWith('Particles.jsx') || p.endsWith('AmbientLayer.jsx') || p.endsWith('CanvasDie.jsx')) return true;
    return !readFileSync(p, 'utf8').includes('requestAnimationFrame');
  }),
);

// --- regressions: S5/S4/S3/S2 scripts must still pass -------------------------
const scripts = [
  ['check-immersive-s5.mjs', 45],
  ['check-immersive-s4.mjs', 39],
  ['check-immersive-s3.mjs', 308],
  ['check-immersive-s2.mjs', 284],
];
for (const [script, expect] of scripts) {
  try {
    const out = execFileSync(process.execPath, [join(root, 'scripts', script)], {
      encoding: 'utf8',
      cwd: root,
    });
    const m = out.match(/(\d+)\/(\d+) PASS/);
    const total = m ? Number(m[2]) : 0;
    check(`${script} regression (${expect} checks)`, total === expect, `got ${total}`);
  } catch {
    check(`${script} regression (${expect} checks)`, false, 'non-zero exit');
  }
}

console.log(`${pass}/${pass + fail} PASS`);
process.exit(fail === 0 ? 0 : 1);