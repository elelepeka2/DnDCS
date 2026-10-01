export const DIE_TYPES = [4, 6, 8, 10, 12, 20];

const MIN_COUNT = 1;
const MAX_COUNT = 20;
const MIN_SIDES = 4;
const MAX_SIDES = 20;

const toInt = (value, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// Build-time face seats shared with TrueDie (S2): outward-normal azimuth ψ°
// and elevation ε° per face. TrueDie seats its plates from these; ORIENTATION
// below holds the matching settle pose — one source of truth for both.
export const FACE_SEATS = {
  // d4: the three standing seats of the Base-Face rest (base plate seats flat).
  4: [
    { psi: 90, elev: 19.4712 },
    { psi: 210, elev: 19.4712 },
    { psi: 330, elev: 19.4712 },
  ],
  // d8: two 4-face pyramid rings sharing the equatorial square (faces 1-4
  // upper, 5-8 lower); the settle inverts each seat so that face meets the
  // camera (rotateX(x) rotateY(y) ⇒ Rx·Ry applied to the body).
  8: [
    { psi: 45, elev: 35.2644 },
    { psi: 135, elev: 35.2644 },
    { psi: 225, elev: 35.2644 },
    { psi: 315, elev: 35.2644 },
    { psi: 45, elev: -35.2644 },
    { psi: 135, elev: -35.2644 },
    { psi: 225, elev: -35.2644 },
    { psi: 315, elev: -35.2644 },
  ],
};

// Value-keyed orientations: the base is the inverse of each face's seating, plus
// 2-3 extra full turns derived from the value itself, so the tumble is
// reproducible — equal value ⇒ identical settle (Deterministic NdX Roll).
// d6 seats face-to-camera; d4 rests base-down and spins value-keyed (every
// plate reads the rolled value — Base-Face); d8 inverts FACE_SEATS. PseudoDie
// (S3) adds the d10/d12/d20 tier.
const ORIENTATION = {
  4: {
    1: { x: 0, y: 0 },
    2: { x: 0, y: 90 },
    3: { x: 0, y: 180 },
    4: { x: 0, y: 270 },
  },
  6: {
    1: { x: 0, y: 0 },
    2: { x: 0, y: -90 },
    3: { x: -90, y: 0 },
    4: { x: 90, y: 0 },
    5: { x: 0, y: 90 },
    6: { x: 0, y: 180 },
  },
  8: Object.fromEntries(
    FACE_SEATS[8].map((seat, i) => [i + 1, { x: -seat.elev, y: seat.psi - 90 }]),
  ),
};

export function orientationFor(sides, value) {
  const v = clamp(toInt(value, 1), 1, sides);
  const extraTurns = 2 + (v % 2);
  const base = ORIENTATION[sides]?.[v];
  if (base) {
    return { x: base.x + 360 * extraTurns, y: base.y + 360 * extraTurns };
  }
  return { x: 360 * extraTurns, y: 360 * extraTurns + (360 * v) / sides };
}

export function rollDice(count, sides, modifier = 0) {
  const c = clamp(toInt(count, MIN_COUNT), MIN_COUNT, MAX_COUNT);
  const s = clamp(toInt(sides, 6), MIN_SIDES, MAX_SIDES);
  const m = toInt(modifier, 0);
  const values = Array.from({ length: c }, () => Math.floor(Math.random() * s) + 1);
  const total = values.reduce((sum, v) => sum + v, 0) + m;
  return { count: c, sides: s, values, modifier: m, total };
}

export function formatNotation({ count, sides, modifier = 0 }) {
  const base = `${count}d${sides}`;
  if (modifier > 0) return `${base}+${modifier}`;
  if (modifier < 0) return `${base}${modifier}`;
  return base;
}

export function formatChip(roll) {
  const total =
    roll.total ?? roll.values.reduce((sum, v) => sum + v, 0) + (roll.modifier ?? 0);
  return `${formatNotation(roll)} = ${total}`;
}

export function normalizeRollEntry(entry) {
  if (Number.isInteger(entry) && entry >= 1 && entry <= 6) {
    return { count: 1, sides: 6, values: [entry], modifier: 0 };
  }
  if (!entry || typeof entry !== 'object') return null;
  const { count, sides, values, modifier } = entry;
  const valid =
    Number.isInteger(count) &&
    count >= MIN_COUNT &&
    count <= MAX_COUNT &&
    Number.isInteger(sides) &&
    sides >= MIN_SIDES &&
    sides <= MAX_SIDES &&
    Array.isArray(values) &&
    values.length === count &&
    values.every((v) => Number.isInteger(v) && v >= 1 && v <= sides);
  if (!valid) return null;
  return { count, sides, values: [...values], modifier: Number.isInteger(modifier) ? modifier : 0 };
}
