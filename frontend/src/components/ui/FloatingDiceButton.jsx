import { Dices } from 'lucide-react';

// Global dice entry point (spec: Global Dice Entry Point).
// Mounted once at App level so it persists across every route.
// Monochrome only — the signal accent stays semantic (design decision 1).
export function FloatingDiceButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir panel de dados"
      className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-pill bg-ink-800 border border-ink-700 text-ink-50 transition-colors hover:bg-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-50 cursor-pointer"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <Dices className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
