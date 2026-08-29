/**
 * The radius scale (redesign.css §1 `--r-*`). `control` is an alias of `md`,
 * kept so pre-M4 call sites keep compiling.
 */
export const radius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 27,
  sheet: 30,
  pill: 999,
  control: 14,
} as const;

/**
 * Component geometry that the mockup draws off the scale above — a field is
 * 16, a segmented track 24, a badge 12. They live here rather than as literals
 * in the components (the token guard forbids those) but stay out of `radius`
 * so the scale itself remains a scale.
 */
export const controlRadius = {
  /** `.inp` — the shared field shell. */
  field: 16,
  /** `.inp.sm` — the compact field (rate/discount). */
  fieldSm: 14,
  /** `.bdg` — status badge. */
  badge: 12,
  /** `.seg` track / `.sg` thumb. */
  segment: 24,
  segmentThumb: 20,
  /** `.stp` — stepper pill (h38). */
  stepper: 19,
  /** `.tabs` — the floating tab pill. */
  tabBar: 22,
  /** `.tbplus` — the raised centre action. */
  fab: 17,
  /** `.toast`. */
  toast: 16,
  /** `.chart .bar i` — the 14 px chart bar. */
  bar: 4,
  /** `.tile.sq64` — the media/product placeholder tile. */
  tile: 18,
  /** `.btnO`/`.abar` button pills: half of their 48/44 heights. */
  buttonMd: 24,
  buttonSm: 22,
} as const;
