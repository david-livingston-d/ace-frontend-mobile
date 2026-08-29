import { Easing } from 'react-native-reanimated';

/**
 * Motion durations (ms) and the one easing curve the app animates on
 * (`cubic-bezier(.22,.61,.36,1)` — the mockup's `.pop` curve).
 *
 * `fast` = a press/ripple, `base` = a segment sliding or a chip settling,
 * `slow` = something entering, `veil` = a backdrop fading.
 */
export const durations = { fast: 80, base: 140, slow: 220, veil: 420 } as const;

/** Alias — reads better at the call site (`duration: motion.base`). */
export const motion = durations;

export const easeStandard = Easing.bezier(0.22, 0.61, 0.36, 1);

/** The success-screen "pop": scale from half up through a slight overshoot. */
export const pop = { from: 0.5, overshoot: 1.07, duration: 600 } as const;

/** The pulsing halo on the current phase dot / timeline node. */
export const pulseRing = { duration: 1000, minSpread: 5, maxSpread: 10 } as const;

/** The skeleton shimmer sweep. */
export const shimmer = { duration: 1400, bandWidth: 260 } as const;
