import { m } from 'framer-motion';
import { FACE_SEATS, orientationFor } from '../../../dice/rollDice';

// True CSS-3D tier — d4/d6/d8 as preserve-3d polyhedra with rounded number
// faces, never pips (spec IMM-D3, design decision 3). Plate seats come from
// the engine's FACE_SEATS so build geometry and settle poses share one source
// of truth; the spring here is the only sanctioned one (220/18).
const FACE_BG = 'linear-gradient(160deg, var(--color-ink-50), var(--color-ink-200))';
const CLIP_UP = 'polygon(50% 0, 100% 100%, 0 100%)';
const CLIP_DOWN = 'polygon(0 0, 100% 0, 50% 100%)';

// Rounded number plate. 6/9 underlines disambiguate orientation; triangles
// clip to the polyhedron outline (base corners keep the face radius).
function Face({ w, h, transform, clip, value, fontSize, align = 'center', padTop = 0, padBottom = 0, bordered = false }) {
  return (
    <div
      className={`absolute flex justify-center ${bordered ? 'border border-ink-950/15' : ''}`}
      style={{
        width: w,
        height: h,
        left: '50%',
        top: '50%',
        marginLeft: -w / 2,
        marginTop: -h / 2,
        transform,
        clipPath: clip,
        borderRadius: Math.max(4, Math.round(w * 0.1)),
        background: FACE_BG,
        alignItems: align,
        paddingTop: padTop,
        paddingBottom: padBottom,
        color: 'var(--color-ink-950)',
        fontWeight: 700,
      }}
    >
      <span
        style={{
          fontSize,
          lineHeight: 1,
          ...(value === 6 || value === 9
            ? { textDecorationLine: 'underline', textUnderlineOffset: '0.16em', textDecorationThickness: '0.08em' }
            : null),
        }}
      >
        {value}
      </span>
    </div>
  );
}

// d4 — tetrahedron resting on its base. Every plate reads the rolled value at
// its foot, so the three visible faces repeat it upright (Base-Face read).
function TetraFaces({ size, value }) {
  const edge = size * 0.9;
  const w = edge;
  const h = (edge * Math.sqrt(3)) / 2;
  const inset = h / 6; // plate centroid sits h/6 below box center — compensated
  const radius = (edge * Math.sqrt(6)) / 12;
  const fontSize = Math.round(size * 0.3);
  const seats = FACE_SEATS[4].map(({ psi, elev }) => (
    <Face
      key={psi}
      w={w}
      h={h}
      transform={`rotateY(${90 - psi}deg) rotateX(${elev}deg) translateY(${-inset}px) translateZ(${radius}px)`}
      clip={CLIP_UP}
      value={value}
      fontSize={fontSize}
      align="flex-end"
      padBottom={h * 0.16}
    />
  ));
  return (
    <>
      <Face
        w={w}
        h={h}
        transform={`rotateX(-90deg) translateY(${-inset}px) translateZ(${radius}px)`}
        clip={CLIP_UP}
        value={value}
        fontSize={fontSize}
        align="flex-end"
        padBottom={h * 0.16}
      />
      {seats}
    </>
  );
}

// d8 — octahedron as two 4-face pyramid rings sharing the equatorial square.
// Faces carry static numbers 1-8; the settle points value n dead-front.
function OctaFaces({ size }) {
  const edge = (size * 0.5) * Math.SQRT2; // octahedron face edge for radius a
  const w = edge;
  const h = (edge * Math.sqrt(3)) / 2;
  const inset = h / 6;
  const radius = (size * 0.5) / Math.sqrt(3);
  const fontSize = Math.round(size * 0.3);
  return FACE_SEATS[8].map(({ psi, elev }, i) => {
    const upper = elev > 0;
    return (
      <Face
        key={i + 1}
        w={w}
        h={h}
        transform={`rotateY(${90 - psi}deg) rotateX(${elev}deg) translateY(${upper ? -inset : inset}px) translateZ(${radius}px)`}
        clip={upper ? CLIP_UP : CLIP_DOWN}
        value={i + 1}
        fontSize={fontSize}
        padTop={upper ? h * 0.16 : 0}
        padBottom={upper ? 0 : h * 0.16}
      />
    );
  });
}

// d6 — the cube, now with centered numerals instead of pips (IMM-D3).
const CUBE_SEATS = {
  1: 'rotateY(0deg)',
  2: 'rotateY(90deg)',
  3: 'rotateX(90deg)',
  4: 'rotateX(-90deg)',
  5: 'rotateY(-90deg)',
  6: 'rotateY(180deg)',
};

function CubeFaces({ size }) {
  const half = size / 2;
  const fontSize = Math.round(size * 0.34);
  return [1, 2, 3, 4, 5, 6].map((face) => (
    <Face
      key={face}
      w={size}
      h={size}
      transform={`${CUBE_SEATS[face]} translateZ(${half}px)`}
      value={face}
      fontSize={fontSize}
      bordered
    />
  ));
}

// FAB → RollPanel tier renderer: one die, value-keyed settle (Face/Repeat).
export function TrueDie({ sides, value, settled, size = 112, prefersReduced = false }) {
  const rotation = settled ? orientationFor(sides, value) : { x: 0, y: 0 };
  return (
    <div style={{ perspective: '800px' }}>
      <m.div
        className="relative"
        style={{ width: size, height: size, transformStyle: 'preserve-3d' }}
        animate={{ rotateX: rotation.x, rotateY: rotation.y }}
        transition={
          prefersReduced
            ? { duration: 0 }
            : { type: 'spring', stiffness: 220, damping: 18 } // THE sanctioned spring
        }
      >
        {sides === 4 ? (
          <TetraFaces size={size} value={value} />
        ) : sides === 8 ? (
          <OctaFaces size={size} />
        ) : (
          <CubeFaces size={size} />
        )}
      </m.div>
    </div>
  );
}
