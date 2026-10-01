// Node structure checks for immersive-ui slice S5 (Dashboard hero band).
// Run: node scripts/check-immersive-s5.mjs  (exit 0 = all pass)
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

const dash = readFileSync(join(root, 'src/pages/Dashboard.jsx'), 'utf8');
const css = readFileSync(join(root, 'src/index.css'), 'utf8');

// S5's CSS slice is bounded to its own section: later slices append after
// the IMM-H2 block, so "to EOF" would leak their keyframes/@media/border
// rules into the band-only absence checks below (S6 tail-slice regression).
const h2Start = css.indexOf('/* ── IMM-H2 Dashboard hero band');
const nextSection = css.indexOf('/* ── IMM-A1 Ambient kit');
const dashCss = css.slice(h2Start, nextSection === -1 ? undefined : nextSection);

// --- IMM-H2 Band: band above "Tus Personajes" with the DND:DOS wordmark -----
const bandStart = dash.indexOf('<section className="dash-band"');
const tusIdx = dash.indexOf('Tus Personajes');
check('Dashboard has .dash-band section', bandStart !== -1);
check(
  'Band sits ABOVE "Tus Personajes"',
  bandStart !== -1 && tusIdx !== -1 && bandStart < tusIdx,
  `band@${bandStart} tus@${tusIdx}`,
);
const mainOpen = dash.match(/<main[^>]*>/);
const between = mainOpen
  ? dash.slice(mainOpen.index + mainOpen[0].length, bandStart)
  : '';
check(
  'Band is first child of <main>',
  !!mainOpen && bandStart > mainOpen.index && /^[\s{}]*$/.test(between.replace(/\/\*[\s\S]*?\*\//g, '')),
  'nothing but a comment/whitespace may precede the band inside main',
);
const bandBlock = dash.match(/<section className="dash-band"[\s\S]*?<\/section>/);
check('Band section block extracted', !!bandBlock);
check(
  'Wordmark "DND:DOS" inside band',
  !!bandBlock && bandBlock[0].includes('DND:DOS'),
);
check(
  'Wordmark is real text (p, not aria-hidden)',
  !!bandBlock && /<p className="dash-wordmark">DND:DOS<\/p>/.test(bandBlock[0]),
);
check('Old kicker "La mesa espera" removed', !bandBlock[0].includes('La mesa espera'));
check(
  'Three tonal planes (far/mid/near)',
  !!bandBlock && (bandBlock[0].match(/className="dash-plane/g) || []).length === 3,
  'need exactly 3 dash-plane elements',
);
check(
  'Planes are aria-hidden decorative',
  !!bandBlock && (bandBlock[0].match(/aria-hidden="true"/g) || []).length >= 3,
);
check(
  'Visible animated hero element: canvas d20',
  !!bandBlock && bandBlock[0].includes('CanvasDie') && bandBlock[0].includes('className="dash-die"'),
);

// --- IMM-H2 Tonal: distinct ink shades per plane, ONLY existing tokens ------
const dashTokens = [...dashCss.matchAll(/var\(--color-([\w-]+)\)/g)].map((m) => m[1]);
const ALLOWED = new Set(['ink-950', 'ink-900', 'ink-800', 'ink-700', 'ink-50']);
check(
  'Band CSS uses ONLY existing ink tokens',
  dashTokens.length > 0 && dashTokens.every((t) => ALLOWED.has(t)),
  [...new Set(dashTokens)].join(', '),
);
check('Plane far uses ink-950', /\.dash-plane-far\s*{[^}]*var\(--color-ink-950\)/.test(dashCss));
check('Plane mid uses ink-900', /\.dash-plane-mid\s*{[^}]*var\(--color-ink-900\)/.test(dashCss));
check('Plane near uses ink-800', /\.dash-plane-near\s*{[^}]*var\(--color-ink-800\)/.test(dashCss));
check(
  'Three distinct tonal shades present',
  ['ink-950', 'ink-900', 'ink-800'].every((t) => dashTokens.includes(t)),
);
check(
  'Contrast held: no hex colors in band CSS',
  !/#[0-9a-fA-F]{3,8}\b/.test(dashCss),
  'band must use tokens only, no arbitrary colors',
);
check('Wordmark uses ink-50 token', /\.dash-wordmark\s*{[^}]*var\(--color-ink-50\)/.test(dashCss));
check(
  'Wordmark display voice (Grotesk 700)',
  /\.dash-wordmark\s*{[^}]*font-family:\s*var\(--font-display\)/.test(dashCss) &&
    /\.dash-wordmark\s*{[^}]*font-weight:\s*700/.test(dashCss),
);
check(
  'Hairline seams (ink-700 via grid gap)',
  dashCss.includes('gap: 1px') && dashCss.includes('background: var(--color-ink-700)'),
);

// --- IMM-H2 NoCards: no card surface added by the band ----------------------
check(
  'Band markup has NO rounded card radius',
  !!bandBlock && !bandBlock[0].includes('rounded'),
);
check('Band markup has NO shadow', !!bandBlock && !bandBlock[0].includes('shadow'));
check(
  'Band markup has NO card-box classes',
  !!bandBlock && !/bg-ink-900|bg-ink-800|border|p-4|p-6/.test(bandBlock[0]),
  'flat tonal planes only — no bg/border/padding card box',
);
check(
  'Band CSS has no card look (radius/shadow/gradient)',
  !/border-radius|box-shadow|linear-gradient/.test(dashCss),
);
check(
  'Dashboard adds NO new card surfaces elsewhere',
  (dash.match(/rounded-control/g) || []).length === 3 && !dash.includes('shadow'),
  'only the 3 pre-existing button radii, no shadows anywhere',
);

// --- IMM-H2 Motion: hero d20 spins via transform-only keyframe, gated -------
const dashKeyframes = [...dashCss.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)];
const dashAnimated = [];
for (const [, , body] of dashKeyframes) {
  const decls = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
  for (const d of decls) if (!dashAnimated.includes(d)) dashAnimated.push(d);
}
check(
  'Band keyframes animate ONLY transform/opacity',
  dashAnimated.length > 0 && dashAnimated.every((p) => p === 'transform' || p === 'opacity'),
  `animated: ${dashAnimated.join(', ')}`,
);
check('dash-spin keyframe present', dashCss.includes('@keyframes dash-spin'));
check('Hero die spins via .dash-die animation', /\.dash-die\s*{[^}]*animation:\s*dash-spin/.test(dashCss));
check(
  'Reduced motion stops the hero die (content stays)',
  /@media \(prefers-reduced-motion: reduce\)\s*{[\s\S]*?\.dash-die\s*{[^}]*animation:\s*none/.test(dashCss),
);

// --- presentation-only: fetch/data logic untouched --------------------------
check('fetchCharacters intact', dash.includes('fetchCharacters') && dash.includes('.from(\'characters\')'));
check('supabase query untouched', dash.includes(".eq('user_id', user.id)"));
check('loading/setLoading flow intact', dash.includes('setLoading(true)') && dash.includes('setLoading(false)'));
check('no new state hooks', (dash.match(/useState\(/g) || []).length === 3, 'characters/isModalOpen/loading only');
check('handlers intact', dash.includes('setIsModalOpen') && dash.includes('signOut') && dash.includes('navigate'));
check('no framer-motion import', !dash.includes('framer-motion'));
check('no spring added', !dash.includes("type: 'spring'"));

// --- Spanish copy preserved --------------------------------------------------
const SPANISH = [
  'Panel de Aventureros',
  'Tus Personajes',
  'Salir',
  'Crear Personaje',
  'Cargando personajes...',
  'No tienes personajes creados aún.',
  'Nivel',
  'Creador desconocido',
];
SPANISH.forEach((s) => check(`Spanish copy: "${s}"`, dash.includes(s)));

// --- restraint gates ----------------------------------------------------------
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