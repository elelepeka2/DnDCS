// diceGeometry.js — pure geometry + settle math for the six D&D dice.
//
// Node-importable (no JSX), so the s2/s3 check scripts validate geometry and
// determinism directly. Every solid is convex, origin-centered, circumradius 1
// (d10 ring vertices sit at ~0.56 — the equilateral trapezohedron's true
// shape), with faces wound CCW outward.
//
// Numbering (standard tabletop): d6 opposites sum 7, d8 → 9, d10 → 11,
// d12 → 13, d20 → 21; d4 carries 1–4 on its four faces (no repeated-value
// hack — each face owns its number). d10 and d12 are built as the polar dual
// of the regular pentagonal antiprism / icosahedron; d4/d6/d8/d20 are the
// classic Platonic coordinates.

export const GEOMETRY = {
  // d4 — regular tetrahedron. Each face carries its own number 1–4.
  4: {
    vertices: [
      [0, 0, 1],
      [0.942809, 0, -0.333333],
      [-0.471405, 0.816497, -0.333333],
      [-0.471405, -0.816497, -0.333333],
    ],
    faces: [
      [1, 3, 2],
      [3, 0, 2],
      [3, 1, 0],
      [0, 1, 2],
    ],
    faceNumbers: [1, 2, 3, 4],
  },

  // d6 — cube. Opposites sum 7: 1↔6, 2↔5, 3↔4.
  6: {
    vertices: [
      [-0.57735, -0.57735, -0.57735],
      [0.57735, -0.57735, -0.57735],
      [0.57735, 0.57735, -0.57735],
      [-0.57735, 0.57735, -0.57735],
      [-0.57735, -0.57735, 0.57735],
      [0.57735, -0.57735, 0.57735],
      [0.57735, 0.57735, 0.57735],
      [-0.57735, 0.57735, 0.57735],
    ],
    faces: [
      [1, 0, 3, 2],
      [4, 5, 6, 7],
      [4, 0, 1, 5],
      [3, 7, 6, 2],
      [0, 4, 7, 3],
      [5, 1, 2, 6],
    ],
    faceNumbers: [1, 6, 2, 5, 3, 4],
  },

  // d8 — octahedron. Opposites sum 9: 1↔8, 2↔7, 3↔6, 4↔5.
  8: {
    vertices: [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ],
    faces: [
      [2, 4, 0],
      [2, 1, 4],
      [2, 5, 1],
      [2, 0, 5],
      [0, 4, 3],
      [4, 1, 3],
      [1, 5, 3],
      [5, 0, 3],
    ],
    faceNumbers: [1, 2, 3, 4, 6, 5, 8, 7],
  },

  // d10 — pentagonal trapezohedron (polar dual of the equilateral antiprism).
  // Numbered 1–10 (never 0–9); opposite kites sum 11.
  10: {
    vertices: [
      [0, 0, 1],
      [0, 0, -1],
      [0.17082, 0.525731, 0.105573],
      [0.447214, 0.32492, -0.105573],
      [-0.447214, 0.32492, 0.105573],
      [-0.17082, 0.525731, -0.105573],
      [-0.447214, -0.32492, 0.105573],
      [-0.552786, 0, -0.105573],
      [0.17082, -0.525731, 0.105573],
      [-0.17082, -0.525731, -0.105573],
      [0.552786, 0, 0.105573],
      [0.447214, -0.32492, -0.105573],
    ],
    faces: [
      [0, 10, 3, 2],
      [2, 5, 4, 0],
      [4, 7, 6, 0],
      [0, 6, 9, 8],
      [10, 0, 8, 11],
      [1, 3, 10, 11],
      [3, 1, 5, 2],
      [1, 7, 4, 5],
      [9, 6, 7, 1],
      [8, 9, 1, 11],
    ],
    faceNumbers: [1, 2, 3, 4, 5, 8, 7, 6, 10, 9],
  },

  // d12 — dodecahedron (polar dual of the icosahedron). Opposites sum 13.
  12: {
    vertices: [
      [-0.934172, -0.356822, 0],
      [-0.57735, -0.57735, -0.57735],
      [0, -0.934172, -0.356822],
      [0, -0.934172, 0.356822],
      [-0.57735, -0.57735, 0.57735],
      [0, 0.934172, 0.356822],
      [0, 0.934172, -0.356822],
      [-0.57735, 0.57735, -0.57735],
      [-0.934172, 0.356822, 0],
      [-0.57735, 0.57735, 0.57735],
      [0.934172, -0.356822, 0],
      [0.57735, -0.57735, 0.57735],
      [0.57735, -0.57735, -0.57735],
      [0.57735, 0.57735, 0.57735],
      [0.934172, 0.356822, 0],
      [0.57735, 0.57735, -0.57735],
      [-0.356822, 0, -0.934172],
      [0.356822, 0, -0.934172],
      [0.356822, 0, 0.934172],
      [-0.356822, 0, 0.934172],
    ],
    faces: [
      [4, 0, 1, 2, 3],
      [5, 6, 7, 8, 9],
      [3, 2, 12, 10, 11],
      [13, 14, 15, 6, 5],
      [12, 2, 1, 16, 17],
      [4, 3, 11, 18, 19],
      [17, 16, 7, 6, 15],
      [13, 5, 9, 19, 18],
      [1, 0, 8, 7, 16],
      [19, 9, 8, 0, 4],
      [17, 15, 14, 10, 12],
      [11, 10, 14, 13, 18],
    ],
    faceNumbers: [1, 2, 11, 12, 3, 4, 9, 10, 5, 6, 7, 8],
  },

  // d20 — icosahedron. Opposites sum 21.
  20: {
    vertices: [
      [-0.525731, -0.850651, 0],
      [-0.525731, 0.850651, 0],
      [0.525731, -0.850651, 0],
      [0.525731, 0.850651, 0],
      [0, -0.525731, -0.850651],
      [0, -0.525731, 0.850651],
      [0, 0.525731, -0.850651],
      [0, 0.525731, 0.850651],
      [-0.850651, 0, -0.525731],
      [-0.850651, 0, 0.525731],
      [0.850651, 0, -0.525731],
      [0.850651, 0, 0.525731],
    ],
    faces: [
      [0, 9, 8],
      [0, 8, 4],
      [0, 4, 2],
      [0, 2, 5],
      [0, 5, 9],
      [1, 7, 3],
      [1, 3, 6],
      [1, 6, 8],
      [1, 8, 9],
      [1, 9, 7],
      [2, 10, 11],
      [2, 11, 5],
      [2, 4, 10],
      [3, 7, 11],
      [3, 11, 10],
      [3, 10, 6],
      [4, 8, 6],
      [4, 6, 10],
      [5, 11, 7],
      [5, 7, 9],
    ],
    faceNumbers: [1, 2, 3, 4, 5, 18, 17, 6, 7, 8, 14, 15, 13, 19, 20, 16, 9, 10, 12, 11],
  },
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const toInt = (value, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : fallback;
};

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

// Unit outward normal of a face (vertices are wound CCW outward, so the cross
// of the first two edges already points out). Shared by renderer + check scripts.
export function faceNormal(geom, faceIndex) {
  const face = geom.faces[faceIndex];
  const [a, b, c] = face.slice(0, 3).map((i) => geom.vertices[i]);
  return normalize(cross(sub(b, a), sub(c, a)));
}

// Deterministic settle rotation: the exact rotation (rotateX(x)·rotateY(y),
// the app's CSS transform convention) that brings the rolled face's outward
// normal to face the camera (+Z), plus 2–3 extra full turns derived from the
// value — SAME VALUE ⇒ SAME FINAL POSE (Face/Repeat contract). Pure function:
// the s2/s3 scripts assert determinism and face-at-camera on it directly.
export function settleRotationFor(sides, value) {
  const s = clamp(toInt(sides, 6), 4, 20);
  const v = clamp(toInt(value, 1), 1, s);
  const geom = GEOMETRY[s];
  const [nx, ny, nz] = faceNormal(geom, geom.faceNumbers.indexOf(v));
  const y = (-Math.atan2(nx, nz) * 180) / Math.PI;
  const x = (Math.atan2(ny, Math.hypot(nx, nz)) * 180) / Math.PI;
  const turns = 360 * (2 + (v % 2));
  return { x: x + turns, y: y + turns };
}