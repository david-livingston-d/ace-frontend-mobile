import { Platform, StyleSheet } from 'react-native';
import { dark, light, type StatusTone } from './colors';

/**
 * Depth, and the only way this app draws it.
 *
 * Every shadow is a CSS `boxShadow` string taken verbatim from the redesign
 * stylesheet's `--sh-*` tokens — never RN's `elevation` (Android-only, no
 * control over spread or colour) and never the `shadow*` props (iOS-only).
 * One string renders the same design on both platforms.
 *
 * Android caveats, handled once here rather than at every call site:
 *  - `boxShadow` arrived with Android 9 (API 28) and *inset* layers only work
 *    from Android 10 (API 29). Below 29 the inset layers are stripped; the
 *    ring they were drawing degrades to a real hairline border.
 *  - Below API 28 there is no `boxShadow` at all, so a shadow becomes a
 *    hairline border and nothing else.
 * `Platform` is read per call (never hoisted to a module constant) so both
 * branches are reachable in one Jest run.
 */
export type ShadowName =
  /* the D1 set */
  | 'none'
  | 'hairline'
  | 'card'
  | 'raised'
  | 'hero'
  | 'overlay'
  | 'inset'
  | 'highlight'
  /* the rest of the mockup's recipes, so no component has to hand-roll one */
  | 'note'
  | 'button'
  | 'outline'
  | 'chip'
  | 'chipOn'
  | 'tabs'
  | 'fab'
  | 'avatar'
  | 'swatch';

export const shadows: Record<'light' | 'dark', Record<ShadowName, string>> = {
  light: {
    none: '',
    hairline: `inset 0 0 0 1px ${light.ring}`,
    card: '0 1px 2px rgba(13, 13, 13, 0.05), 0 10px 28px rgba(13, 13, 13, 0.07)',
    raised: '0 4px 10px rgba(13, 13, 13, 0.1), 0 14px 28px rgba(13, 13, 13, 0.18)',
    hero: '0 18px 36px rgba(13, 13, 13, 0.3)',
    overlay: '0 -24px 60px rgba(13, 13, 13, 0.3)',
    inset: 'inset 0 2px 4px rgba(13, 13, 13, 0.06)',
    highlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.7)',
    note: '0 6px 16px rgba(13, 13, 13, 0.06)',
    button: '0 14px 28px rgba(13, 13, 13, 0.32)',
    outline: '0 8px 20px rgba(13, 13, 13, 0.08)',
    chip: '0 6px 14px rgba(13, 13, 13, 0.07)',
    chipOn: '0 8px 18px rgba(13, 13, 13, 0.3)',
    tabs: '0 18px 44px rgba(13, 13, 13, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.6)',
    fab: '0 12px 26px rgba(13, 13, 13, 0.38)',
    avatar: '0 6px 14px rgba(13, 13, 13, 0.25)',
    swatch: `inset 0 0 0 1px ${light.ring}, 0 4px 10px rgba(13, 13, 13, 0.1)`,
  },
  dark: {
    none: '',
    hairline: `inset 0 0 0 1px ${dark.ring}`,
    card: '0 10px 28px rgba(0, 0, 0, 0.4)',
    raised: '0 4px 10px rgba(0, 0, 0, 0.35), 0 14px 28px rgba(0, 0, 0, 0.45)',
    hero: '0 18px 36px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(244, 244, 244, 0.12)',
    overlay: '0 -24px 60px rgba(0, 0, 0, 0.6)',
    inset: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    highlight: 'inset 0 1px 0 rgba(244, 244, 244, 0.06)',
    note: '0 6px 16px rgba(0, 0, 0, 0.35)',
    button: '0 14px 28px rgba(0, 0, 0, 0.45)',
    outline: '0 8px 20px rgba(0, 0, 0, 0.35)',
    chip: `inset 0 0 0 1px ${dark.ring}`,
    chipOn: '0 8px 18px rgba(0, 0, 0, 0.45)',
    tabs: '0 18px 44px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(244, 244, 244, 0.08)',
    fab: '0 12px 26px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(244, 244, 244, 0.16)',
    avatar: '0 6px 14px rgba(0, 0, 0, 0.45)',
    swatch: `inset 0 0 0 1px ${dark.ring}, 0 4px 10px rgba(0, 0, 0, 0.4)`,
  },
};

/**
 * Tinted drop shadow for a toned surface — an overdue chip glows faintly red
 * rather than grey (`--sh-tone-*`). The stylesheet only names red/green/amber;
 * `info` and `neutral` are extrapolated from their own tone foregrounds with
 * the same geometry and alpha, so every `StatusTone` has one.
 */
const TONE_RGB: Record<StatusTone, string> = {
  neutral: '92, 92, 102',
  info: '60, 95, 146',
  success: '61, 115, 80',
  warning: '150, 103, 28',
  danger: '168, 60, 49',
};

export function toneShadow(tone: StatusTone, mode: 'light' | 'dark'): string {
  return `0 10px 24px rgba(${TONE_RGB[tone]}, ${mode === 'dark' ? 0.3 : 0.14})`;
}

/** Joins shadow layers the way CSS does, skipping empty ones. */
export function combine(...layers: string[]): string {
  return layers.filter(Boolean).join(', ');
}

export type ShadowRing = { color: string; width?: number };

export type ShadowStyle = { boxShadow?: string; borderWidth?: number; borderColor?: string };

function isInsetLayer(layer: string): boolean {
  return layer.trim().startsWith('inset');
}

/** Splits a boxShadow string into layers on the commas *between* layers (the
 * commas inside `rgba(...)` are not separators). */
function layersOf(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * The selection halo: two rings drawn outside the control (the page colour,
 * then jet), which is how a chosen colour swatch reads as chosen without a
 * border changing its size. Generated here so *every* box shadow in the app
 * still comes out of this module.
 */
export function selectionHalo(page: string, ink: string): ShadowStyle {
  const legacyAndroid =
    Platform.OS === 'android' && typeof Platform.Version === 'number' ? Platform.Version : 0;
  // Outset shadows need API 28; below that the halo is a plain 2 px ring.
  if (legacyAndroid && legacyAndroid < 28) return { borderWidth: 2, borderColor: ink };
  return { boxShadow: `0 0 0 2.5px ${page}, 0 0 0 4.5px ${ink}` };
}

/**
 * The style a component spreads to get depth.
 *
 * @param name  which preset
 * @param mode  the active theme
 * @param ring  an extra inset ring drawn on top (a focused field, a chip's
 *              hairline) — it degrades to a real border wherever the platform
 *              cannot draw an inset shadow.
 */
export function shadow(name: ShadowName, mode: 'light' | 'dark', ring?: ShadowRing): ShadowStyle {
  const ringWidth = ring?.width ?? 1;
  const ringLayer = ring ? `inset 0 0 0 ${ringWidth}px ${ring.color}` : '';
  const full = combine(shadows[mode][name], ringLayer);

  // Reading the platform is confined to this function by design: it is the one
  // place in the app allowed to know what platform it is running on. Read per
  // call, never hoisted — a module constant would be captured at import time,
  // which makes the branches below untestable in one Jest run.
  const legacyAndroid =
    Platform.OS === 'android' && typeof Platform.Version === 'number' ? Platform.Version : 0;

  if (legacyAndroid && legacyAndroid < 29) {
    const border: ShadowStyle = ring
      ? { borderWidth: ringWidth, borderColor: ring.color }
      : { borderWidth: StyleSheet.hairlineWidth, borderColor: mode === 'dark' ? dark.ring : light.ring };
    // API 28 still draws outset layers; API 26–27 draws nothing at all.
    if (legacyAndroid >= 28) {
      const outset = layersOf(full).filter((l) => !isInsetLayer(l));
      return outset.length ? { boxShadow: outset.join(', '), ...border } : border;
    }
    return border;
  }

  return full ? { boxShadow: full } : {};
}
