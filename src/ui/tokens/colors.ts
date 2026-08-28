/**
 * Every colour in the app, light and dark.
 *
 * Values are the M4 redesign stylesheet's section 1 "Tokens"
 * (`design/reference/redesign/redesign.css`) — `:root` for light, `.thm-dark`
 * for dark. Emphasis is contrast, never colour: the only hues in the system
 * are the five semantic status tones.
 *
 * The pre-M4 key names (`bg`, `surface`, `surfaceSunken`, `border`, …) are all
 * still here as aliases of the new ones so every screen and test keeps working
 * — `bg` *is* `page`, `surface` *is* `card`.
 */

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type TonePair = { fg: string; bg: string };

export type Colors = {
  /* surfaces */
  page: string;
  card: string;
  sunken: string;
  sheet: string;
  /** Translucent bar/veil surface — tab bar, action bar. */
  chrome: string;
  /** Backdrop behind a sheet or modal. */
  veil: string;
  /** The sheet's grab handle. */
  grab: string;
  /** Segmented-control track. */
  seg: string;
  /** Skeleton shimmer band, base -> highlight. */
  skeletonBase: string;
  skeletonHighlight: string;
  /** Inactive rail/bar/dot fill (phase dots, timeline rail, chart bars). */
  dim: string;

  /* ink */
  text: string;
  muted: string;
  subtle: string;
  /** Divider / card edge at 7% — the faintest line in the system. */
  hairline: string;
  /** Control ring at 10%, and its softer 8% variant for fields. */
  ring: string;
  ringSoft: string;
  /** Error ring drawn inside a field. */
  errRing: string;
  /** The 22 px timeline node's surface and ring (canvas edit #1) — a raised
   * disc, one step lighter than the card it sits on in dark. */
  discSurface: string;
  discRing: string;

  /* jet / inverse — the "primary" of a colourless system */
  jet: string;
  onJet: string;
  /** Radial-gradient stops for hero surfaces (`HeroTile`, login page). */
  heroStops: [string, string, string];
  heroText: string;
  heroLabel: string;
  /** Radial-gradient stops for `Avatar`. */
  avatarStops: [string, string];
  /** Gradient stops for `MediaFrame`'s placeholder tile. */
  tileStops: [string, string];
  /** The drop shadow behind the hero tile's digit (canvas edit #2) — the one
   * text shadow in the system. */
  heroDigitShadow: string;

  /* toast — a dark slab in both themes */
  toastBg: string;
  toastFg: string;

  /* destructive fill (swipe-to-delete, danger button) */
  dangerSolid: string;
  onDanger: string;

  /* pre-M4 aliases (kept so nothing has to be renamed) */
  bg: string;
  surface: string;
  surfaceSunken: string;
  textStrong: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderStrong: string;
  inverseBg: string;
  inverseText: string;
  solidBg: string;
  solidFg: string;
  ghostHover: string;
  disabledBg: string;
  disabledFg: string;
  focus: string;
  /** The solid button/FAB while pressed — a darker jet in light, a dimmer
   * bright in dark. Presses darken, they never fade (no opacity). */
  solidPressed: string;

  tone: Record<StatusTone, TonePair>;
};

/** The neutral ramp the pre-M4 kit was built on. Retained because a couple of
 * call sites still reference it by number; new code takes named tokens above. */
export const n = { 0: '#ffffff', 25: '#fafafa', 50: '#f4f4f4', 100: '#ebebeb', 200: '#dcdcdc', 300: '#c4c4c4', 400: '#9b9b9b', 500: '#767676', 600: '#5a5a5a', 700: '#414141', 800: '#2b2b2b', 900: '#1a1a1a', 950: '#0d0d0d' } as const;

/** The DS constants that do not flip with the theme (redesign.css "constants"). */
export const VOID = '#0d0d0d';
export const BRIGHT = '#f4f4f4';

export const light: Colors = {
  page: '#f5f5f7',
  card: '#ffffff',
  sunken: '#eeeef1',
  sheet: '#f8f8fa',
  chrome: 'rgba(255, 255, 255, 0.92)',
  veil: 'rgba(13, 13, 13, 0.45)',
  grab: '#d8d8dc',
  seg: '#eaeaee',
  skeletonBase: '#eaeaee',
  skeletonHighlight: '#f5f5f7',
  dim: '#d4d4d9',

  text: '#2b2b2b',
  muted: '#8f8f96',
  subtle: '#9a9aa2',
  hairline: 'rgba(13, 13, 13, 0.07)',
  ring: 'rgba(13, 13, 13, 0.1)',
  ringSoft: 'rgba(13, 13, 13, 0.08)',
  errRing: 'rgba(168, 60, 49, 0.4)',
  discSurface: '#ffffff',
  discRing: 'rgba(13, 13, 13, 0.07)',

  jet: VOID,
  onJet: BRIGHT,
  heroStops: ['#3d3d3f', '#1a1a1c', '#0d0d0d'],
  heroText: BRIGHT,
  heroLabel: 'rgba(244, 244, 244, 0.55)',
  avatarStops: ['#4a4a4e', '#131315'],
  tileStops: ['#ececef', '#dcdce1'],
  heroDigitShadow: 'rgba(0, 0, 0, 0.55)',

  toastBg: 'rgba(32, 32, 35, 0.97)',
  toastFg: BRIGHT,

  dangerSolid: '#a83c31',
  onDanger: '#ffffff',

  bg: '#f5f5f7',
  surface: '#ffffff',
  surfaceSunken: '#eeeef1',
  textStrong: VOID,
  textMuted: '#8f8f96',
  textSubtle: '#9a9aa2',
  border: 'rgba(13, 13, 13, 0.07)',
  borderStrong: VOID,
  inverseBg: VOID,
  inverseText: BRIGHT,
  solidBg: VOID,
  solidFg: BRIGHT,
  ghostHover: '#eeeef1',
  disabledBg: '#eeeef1',
  disabledFg: '#8f8f96',
  focus: VOID,
  solidPressed: '#2b2b2b',

  tone: {
    neutral: { fg: '#5c5c66', bg: '#ececf0' },
    info: { fg: '#3c5f92', bg: '#e2eaf5' },
    success: { fg: '#3d7350', bg: '#e1eee5' },
    warning: { fg: '#96671c', bg: '#f6ecda' },
    danger: { fg: '#a83c31', bg: '#f7e2e0' },
  },
};

export const dark: Colors = {
  page: '#141416',
  card: '#1e1e21',
  sunken: '#232326',
  sheet: '#161618',
  chrome: 'rgba(26, 26, 29, 0.92)',
  veil: 'rgba(0, 0, 0, 0.6)',
  grab: '#3a3a3e',
  seg: '#232326',
  skeletonBase: '#232326',
  skeletonHighlight: '#2c2c30',
  dim: '#3a3a3e',

  text: '#e8e8ec',
  muted: '#8f8f96',
  subtle: '#7c7c84',
  hairline: 'rgba(244, 244, 244, 0.1)',
  ring: 'rgba(244, 244, 244, 0.12)',
  ringSoft: 'rgba(244, 244, 244, 0.1)',
  errRing: 'rgba(224, 138, 128, 0.45)',
  discSurface: '#26262a',
  discRing: 'rgba(244, 244, 244, 0.14)',

  jet: BRIGHT,
  onJet: VOID,
  // The hero surface is glossy black in *both* themes — these do not flip.
  heroStops: ['#3d3d3f', '#1a1a1c', '#0d0d0d'],
  heroText: BRIGHT,
  heroLabel: 'rgba(244, 244, 244, 0.55)',
  avatarStops: ['#4a4a4e', '#131315'],
  tileStops: ['#26262a', '#1a1a1d'],
  heroDigitShadow: 'rgba(0, 0, 0, 0.55)',

  toastBg: 'rgba(32, 32, 35, 0.97)',
  toastFg: BRIGHT,

  dangerSolid: '#7e2b23',
  onDanger: BRIGHT,

  bg: '#141416',
  surface: '#1e1e21',
  surfaceSunken: '#232326',
  textStrong: '#ffffff',
  textMuted: '#8f8f96',
  textSubtle: '#7c7c84',
  border: 'rgba(244, 244, 244, 0.1)',
  borderStrong: BRIGHT,
  inverseBg: BRIGHT,
  inverseText: VOID,
  solidBg: BRIGHT,
  solidFg: VOID,
  ghostHover: 'rgba(244, 244, 244, 0.1)',
  disabledBg: '#232326',
  disabledFg: '#8f8f96',
  focus: BRIGHT,
  solidPressed: '#d4d4d9',

  tone: {
    neutral: { fg: '#b9b9c0', bg: '#2a2a2e' },
    info: { fg: '#8fb2e0', bg: '#1f2a3a' },
    success: { fg: '#8fcea4', bg: '#1e2c22' },
    warning: { fg: '#e0b36a', bg: '#332a18' },
    danger: { fg: '#e08a80', bg: '#361d1a' },
  },
};

/** Product colour attributes — order *data*, not chrome, so they never flip
 * with the theme. Used as the fallback fill for a `ColorSwatch` whose
 * attribute value carries a recognisable name but no hex. */
export const productColors: Record<string, string> = {
  blue: '#2c3550',
  red: '#8c2f2a',
  black: '#141414',
  white: '#fdfdfd',
};
