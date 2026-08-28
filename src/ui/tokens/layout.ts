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

/** Side inset of the floating tab pill (`.tabs { left: 18; right: 18 }`). */
export const TAB_BAR_INSET = 18;

/** Control heights from the mockup (redesign.css §9–§12). */
export const CONTROL = {
  buttonLg: 54,
  buttonMd: 48,
  buttonSm: 44,
  ghost: 44,
  field: 50,
  fieldSm: 44,
  fieldTall: 78,
  segment: 38,
  stepper: 38,
  stepperButton: 36,
  sizeChip: 40,
  sizeChipMinWidth: 46,
  swatch: 34,
  iconDisc: 58,
  timelineDisc: 22,
  avatar: 40,
  avatarLg: 58,
  backButton: 42,
  iconButton: 44,
  grabWidth: 44,
  grabHeight: 5,
  /** The size badge on a variant row (canvas edit #4). */
  variantSizeBadgeWidth: 52,
  variantSizeBadgeHeight: 38,
} as const;

/** `MediaFrame`'s aspect ratio (`.mf { aspect-ratio: 5 / 4 }`) — a 2-column
 * grid shows four products above the floating cart badge. */
export const MEDIA_RATIO = 5 / 4;

/**
 * Hit-area padding, mirroring redesign.css §25 one-for-one: each control keeps
 * the box it draws and gains a transparent `hitSlop` that pads the *touch* box
 * out to at least 44 × 44.
 */
export const hit = {
  /** 42 -> 44 */
  back: { top: 1, bottom: 1, left: 1, right: 1 },
  /** 34 -> 44 */
  swatch: { top: 5, bottom: 5, left: 5, right: 5 },
  /** 40 x 46 -> 44 x 46 */
  sizeChip: { top: 2, bottom: 2, left: 0, right: 0 },
  /** 33 -> 45 tall */
  chip: { top: 6, bottom: 6, left: 2, right: 2 },
  /** 29 -> 45 tall */
  chipSm: { top: 8, bottom: 8, left: 2, right: 2 },
  /** 38 x 36 -> 44 x 44 */
  stepperButton: { top: 3, bottom: 3, left: 4, right: 4 },
  /** 36 x 46 -> 44 x 46 */
  tab: { top: 4, bottom: 4, left: 0, right: 0 },
  /** 38 -> 44 tall */
  segment: { top: 3, bottom: 3, left: 0, right: 0 },
  /** a text link, 16 -> 44 tall */
  link: { top: 14, bottom: 14, left: 8, right: 8 },
} as const;
