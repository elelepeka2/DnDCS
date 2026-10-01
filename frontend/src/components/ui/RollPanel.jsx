import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { backdropVariants, panelVariants } from './motionVariants';
import {
  DIE_TYPES,
  formatChip,
  formatNotation,
  normalizeRollEntry,
  orientationFor,
  rollDice,
} from '../../dice/rollDice';

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

const HISTORY_KEY = 'dndcs.dice.history';
const MAX_HISTORY = 5;

// Read-time migration: legacy int entries become single-d6 objects; storage
// itself is never rewritten on load (design decision 2).
function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRollEntry).filter(Boolean).slice(0, MAX_HISTORY);
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
  const [count, setCount] = useState(1);
  const [sides, setSides] = useState(6);
  const [modifier, setModifier] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const hydratedHistory = useRef(history);

  // Last-5 history persists across sessions (batch scope: localStorage).
  // The first run is skipped so loading never rewrites stored legacy ints.
  useEffect(() => {
    if (history === hydratedHistory.current) return;
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

  const showCube = count === 1 && sides === 6;
  const rotation =
    result !== null && result.count === 1 && result.sides === 6
      ? orientationFor(6, result.values[0])
      : { x: 0, y: 0 };

  const handleRoll = () => {
    const rolled = rollDice(count, sides, modifier);
    setResult(rolled);
    setHistory((prev) =>
      [
        { count: rolled.count, sides: rolled.sides, values: rolled.values, modifier: rolled.modifier },
        ...prev,
      ].slice(0, MAX_HISTORY),
    );
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

              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-400">Cantidad</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      aria-label="Reducir cantidad"
                      className="h-7 w-7 rounded-pill border border-ink-700 bg-ink-800 text-xs font-medium text-ink-400 hover:text-ink-50 transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-mono text-sm text-ink-50">{count}</span>
                    <button
                      type="button"
                      onClick={() => setCount((c) => Math.min(20, c + 1))}
                      aria-label="Aumentar cantidad"
                      className="h-7 w-7 rounded-pill border border-ink-700 bg-ink-800 text-xs font-medium text-ink-400 hover:text-ink-50 transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de dado">
                  {DIE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSides(type)}
                      aria-pressed={sides === type}
                      className={
                        sides === type
                          ? 'rounded-pill border border-ink-50 bg-ink-50 px-2.5 py-1 font-mono text-xs font-medium text-ink-950 transition-colors cursor-pointer'
                          : 'rounded-pill border border-ink-700 bg-ink-800 px-2.5 py-1 font-mono text-xs font-medium text-ink-400 hover:text-ink-50 transition-colors cursor-pointer'
                      }
                    >
                      d{type}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-400">Modificador</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModifier((m) => m - 1)}
                      aria-label="Reducir modificador"
                      className="h-7 w-7 rounded-pill border border-ink-700 bg-ink-800 text-xs font-medium text-ink-400 hover:text-ink-50 transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-mono text-sm text-ink-50">
                      {modifier >= 0 ? `+${modifier}` : modifier}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModifier((m) => m + 1)}
                      aria-label="Aumentar modificador"
                      className="h-7 w-7 rounded-pill border border-ink-700 bg-ink-800 text-xs font-medium text-ink-400 hover:text-ink-50 transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* CSS 3D cube: perspective on the parent, preserve-3d on the die */}
              {showCube && (
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
              )}

              <div className="mb-4 text-center" aria-live="polite">
                {result === null ? (
                  <p className="text-sm text-ink-400">Tira el dado para empezar</p>
                ) : (
                  <>
                    <span className="block text-xs font-medium uppercase text-ink-400">Total</span>
                    <m.span
                      key={formatChip(result)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.1 }}
                      className="block font-mono text-5xl font-bold text-ink-50"
                    >
                      {result.total}
                    </m.span>
                    <span className="mt-2 inline-block rounded-pill border border-ink-700 bg-ink-800 px-3 py-1 font-mono text-sm text-ink-200">
                      {formatChip(result)}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center gap-3">
                <span className="rounded-pill border border-ink-700 bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-400">
                  {formatNotation({ count, sides, modifier })}
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
                    {history.map((entry, i) => (
                      <li
                        key={`${formatChip(entry)}-${i}`}
                        className="rounded-pill border border-ink-700 bg-ink-800 px-3 py-1 font-mono text-sm text-ink-200"
                      >
                        {formatChip(entry)}
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
