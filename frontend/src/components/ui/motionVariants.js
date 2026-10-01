// Shared motion language for the redesign (research #39 / design Motion Spec).
// Timings: enter 225ms, exit 195ms, desktop 150-200ms, stagger 20ms.
// Asymmetric easing: deceleration (ease-out) on enter, acceleration (ease-in) on exit.
// Springs are reserved for the dice hero moment only (Phase 4) — never here.

export const EASE_OUT = [0, 0, 0.2, 1]; // M3 deceleration
export const EASE_IN = [0.4, 0, 1, 1]; // M3 acceleration

export const DURATION = {
  enter: 0.225,
  exit: 0.195,
  desktop: 0.175,
  tabPill: 0.18,
  stagger: 0.02,
};

// Routes: fade + 8px y (upward on enter and exit), AnimatePresence mode="wait"
export const routeVariants = {
  enter: { opacity: 0, y: 8, transition: { duration: DURATION.enter, ease: EASE_OUT } },
  center: { opacity: 1, y: 0, transition: { duration: DURATION.enter, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.exit, ease: EASE_IN } },
};

// Lists: y6px + stagger 20ms (container propagates, items settle individually)
export const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: DURATION.stagger, delayChildren: 0.05 } },
};

export const listItem = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.enter, ease: EASE_OUT } },
};

// Modals: backdrop fade + panel 0.98→1 / 8px y; exit ≤195ms
export const backdropVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: DURATION.enter, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DURATION.exit, ease: EASE_IN } },
};

export const panelVariants = {
  enter: { opacity: 0, y: 8, scale: 0.98 },
  center: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION.enter, ease: EASE_OUT } },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: DURATION.exit, ease: EASE_IN } },
};

// Tab pill: layoutId tween 180ms (no spring — M3 rule)
export const tabPillTransition = { duration: DURATION.tabPill, ease: EASE_OUT };
