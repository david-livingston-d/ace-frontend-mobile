/**
 * Fixed layout figures that more than one component has to agree on.
 *
 * They live here rather than in `spacing` because they are *sizes of chrome*,
 * not spacing steps: a toast has to clear the tab bar without importing the
 * navigator, and the tab bar itself has to be that tall.
 */

/** The bottom tab bar's own height, before its safe-area inset is added. */
export const TAB_BAR_HEIGHT = 64;

/** How far anything floating over the bar (the raised centre action) rises
 * above it — the gap a toast or badge must also clear. */
export const TAB_BAR_FLOAT = 12;

/** Diameter of the raised centre "+" action. */
export const FAB_SIZE = 50;
