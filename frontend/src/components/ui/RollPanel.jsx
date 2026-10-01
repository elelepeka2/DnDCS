import { useEffect, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { backdropVariants, panelVariants } from './motionVariants';

// Deterministic d6 face → base cube orientation (spec: Deterministic d6 Roll).
// Each face is seated with rotateY/X(±90|180) + translateZ(half); the cube
// rotation below is the inverse, so face N ends up facing the viewer.
const FACE_ROTATIONS = {
  1: { x: 0, y: 0 }, // front
  2: { x: 0, y: -90 }, // right
  3: { x: -90, y: 0 }, // top
  4: { x: 90, y: 0 }, // bottom
  5: { x: 0, y: 90 }, // left
  6: { x: 0, y: 180 }, // back
};

// CSS transform seating each face on the 112px cube (half = 56px)
const FACE_TRANSFORMS = {
  1: 'rotateY(0deg) translateZ(56px)',
  2: 'rotateY(90deg) translateZ(56px)',
  3: 'rotateX(90deg) translateZ(56px)',
  4: 'rotateX(-90deg) translateZ(56px)',
  5: 'rotateY(-90deg) translateZ(56px)',
  6: 'rotateY(180deg) translateZ(56px)',
};

// Pip layouts as 3x3 grid coordinates [row, col]
const PIPS = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

// Pure: same value ⇒ identical orientation. 2-3 extra full turns are derived
// from the value itself, so the tumble is reproducible (spec: Reproducibility).
function rotationForFace(value) {
  const base = FACE_ROTATIONS[value] ?? FACE_ROTATIONS[1];
  const extraTurns = 2 + (value % 2);
  return { x: base.x + 360 * extraTurns, y: base.y + 360 * extraTurns };
}

function rollDie(sides = 6) {
  const value = Math.floor(Math.random() * sides) + 1;
  return { value, rotation: rotationForFace(value) };
}

const HISTORY_KEY = 'dndcs.dice.history';
const MAX_HISTORY = 5;

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 6)
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function DieFace({ value }) {
  const pips = PIPS[value];
  return (
    <div
      className="absolute inset-0 bg-ink-50 border border-ink-950/15 flex items-center justify-center"
      style={{ transform: FACE_TRANSFORMS[value] }}
    >
      <div className="grid grid-cols-3 grid-rows-3 h-3/4 w-3/4">
        {Array.from({ length: 9 }, (_, cell) => {
          const row = Math.floor(cell / 3);
          const col = cell % 3;
          const hasPip = pips.some(([r, c]) => r === row && c === col);
          return (
            <div key={cell} className="flex items-center justify-center">
              {hasPip && <span className="block h-2.5 w-2.5 rounded-full bg-ink-950" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// FAB → RollPanel: local state only — no store, no supabase, no screen props (design Data Flow)
export function RollPanel({ isOpen, onClose }) {
  const prefersReduced = useReducedMotion();
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState(readHistory);

  // Last-5 history persists across sessions (batch scope: localStorage)
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Storage unavailable — history stays in-memory for this session
    }
  }, [history]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleRoll = () => {
    const { value, rotation: next } = rollDie(6);
    setResult(value);
    setRotation(next);
    setHistory((prev) => [value, ...prev].slice(0, MAX_HISTORY));
  };

  return (
    // inert + pointer-events-none make the overlay non-interactive during its exit
    <div inert={!isOpen} aria-hidden={!isOpen} className={isOpen ? undefined : 'pointer-events-none'}>
      <AnimatePresence>
        {isOpen && (
          <m.div
            variants={backdropVariants}
            initial="enter"
            animate="center"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
          >
            <m.div
              variants={panelVariants}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Panel de dados"
              className="bg-ink-900 border border-ink-700 p-6 w-full max-w-sm text-ink-50 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Dados</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar panel de dados"
                  className="rounded-pill border border-ink-700 bg-ink-800 px-3 py-1 text-xs font-medium text-ink-400 hover:text-ink-50 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {/* CSS 3D cube: perspective on the parent, preserve-3d on the die */}
              <div className="mb-4 flex items-center justify-center" style={{ perspective: '800px' }}>
                <m.div
                  className="relative h-28 w-28"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateX: rotation.x, rotateY: rotation.y }}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 220, damping: 18 } // THE sanctioned spring (design dice hero)
                  }
                >
                  {[1, 2, 3, 4, 5, 6].map((face) => (
                    <DieFace key={face} value={face} />
                  ))}
                </m.div>
              </div>

              <div className="mb-4 text-center" aria-live="polite">
                {result === null ? (
                  <p className="text-sm text-ink-400">Tira el dado para empezar</p>
                ) : (
                  <m.span
                    key={result}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.1 }}
                    className="block font-mono text-5xl font-bold text-ink-50"
                  >
                    {result}
                  </m.span>
                )}
              </div>

              <div className="flex items-center justify-center gap-3">
                <span className="rounded-pill border border-ink-700 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-400">
                  d6
                </span>
                <button
                  type="button"
                  onClick={handleRoll}
                  className="px-6 py-2.5 bg-ink-50 hover:bg-ink-200 text-ink-950 rounded-control text-sm font-bold transition-colors cursor-pointer"
                >
                  Tirar
                </button>
              </div>

              <div className="mt-5">
                <h3 className="text-xs font-medium text-ink-400 uppercase mb-2">Historial</h3>
                {history.length === 0 ? (
                  <p className="text-sm text-ink-400">Sin tiradas todavía</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {history.map((n, i) => (
                      <li
                        key={`${n}-${i}`}
                        className="rounded-pill border border-ink-700 bg-ink-800 px-3 py-1 font-mono text-sm text-ink-200"
                      >
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
