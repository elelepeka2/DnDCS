// IMM-A1 Ambient decor kit: single global mount (App.jsx, inside
// MotionConfig), aria-hidden, fixed behind content, reduced-motion safe.
//
// Zones: far = the tabletop horizon (turning d20 line art + sparse motes),
// near = the table's edge (the adventurer keeps watch + denser motes).
// Loops are CSS keyframes (transform/opacity only, index.css); will-change
// is applied TRANSIENTLY by JS — after first paint, released on unmount or
// reduced motion — never static (design decision 9).
import { useEffect, useRef } from 'react';
import { Particles } from './Particles';
import { LineArt } from './LineArt';
import { CharacterSprite } from './CharacterSprite';

export function AmbientLayer() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;

    const sync = () => {
      // Transient will-change: added one frame AFTER first paint (loops are
      // live), removed on unmount / reduced motion — never left on statics.
      root.classList.remove('ambient-animating');
      if (!reduce.matches) root.classList.add('ambient-animating');
    };

    raf = requestAnimationFrame(sync);
    reduce.addEventListener('change', sync);

    return () => {
      cancelAnimationFrame(raf);
      reduce.removeEventListener('change', sync);
      root.classList.remove('ambient-animating');
    };
  }, []);

  return (
    <div ref={rootRef} className="ambient" aria-hidden="true">
      {/* Far zone: the horizon — d20 outline turning slowly, sparse motes. */}
      <div className="ambient-zone ambient-zone--far">
        <LineArt />
        <Particles count={16} seed={3} />
      </div>
      {/* Near zone: at the table's edge — static sprite, denser motes. */}
      <div className="ambient-zone ambient-zone--near">
        <CharacterSprite />
        <Particles count={24} seed={11} />
      </div>
    </div>
  );
}