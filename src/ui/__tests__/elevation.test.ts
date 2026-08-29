import { Platform } from 'react-native';
import {
  combine,
  shadow,
  shadows,
  toneChipShadow,
  toneRing,
  toneShadow,
  type ShadowName,
} from '@/ui/tokens/elevation';

const NAMES: ShadowName[] = [
  'none', 'hairline', 'card', 'raised', 'hero', 'overlay', 'inset', 'highlight',
  'note', 'disc', 'button', 'outline', 'chip', 'chipOn', 'tabs', 'fab', 'avatar', 'swatch',
];

/** `Platform.OS`/`Platform.Version` are read per call inside `shadow()` (never
 * hoisted), which is the only reason both platform branches are testable in one
 * Jest run. */
function asAndroid(version: number, run: () => void) {
  const os = Platform.OS;
  const v = Platform.Version;
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
  try {
    run();
  } finally {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    Object.defineProperty(Platform, 'Version', { value: v, configurable: true });
  }
}

describe('shadow tokens', () => {
  test('every name has a light and a dark string', () => {
    for (const name of NAMES) {
      expect(typeof shadows.light[name]).toBe('string');
      expect(typeof shadows.dark[name]).toBe('string');
    }
    expect(shadows.light.none).toBe('');
    expect(shadows.dark.none).toBe('');
  });

  test('light and dark differ where the mockup says they do', () => {
    expect(shadows.light.card).not.toBe(shadows.dark.card);
    expect(shadows.light.card).toContain('0 10px 28px');
    expect(shadows.dark.card).toContain('0 10px 28px');
  });
});

describe('shadow()', () => {
  test('iOS gets the full string, inset layers included', () => {
    expect(shadow('inset', 'light')).toEqual({ boxShadow: shadows.light.inset });
    expect(shadow('card', 'dark')).toEqual({ boxShadow: shadows.dark.card });
  });

  test('Android 29+ gets the full string too', () => {
    asAndroid(29, () => {
      expect(shadow('inset', 'light')).toEqual({ boxShadow: shadows.light.inset });
    });
  });

  test('Android 28 drops inset layers and falls back to a hairline border', () => {
    asAndroid(28, () => {
      const inset = shadow('inset', 'light');
      expect(inset.boxShadow ?? '').not.toContain('inset');
      expect(inset.borderWidth).toBeGreaterThan(0);

      // An outset-only name keeps its shadow on API 28.
      expect(shadow('card', 'light').boxShadow).toBe(shadows.light.card);
    });
  });

  test('Android 26 gets no boxShadow at all — border only', () => {
    asAndroid(26, () => {
      const card = shadow('card', 'light');
      expect(card.boxShadow).toBeUndefined();
      expect(card.borderWidth).toBeGreaterThan(0);
      expect(typeof card.borderColor).toBe('string');
    });
  });

  test('a ring degrades to a real border where boxShadow cannot draw it', () => {
    const ios = shadow('inset', 'light', { color: 'rgba(1,2,3,0.4)', width: 1.5 });
    expect(ios.boxShadow).toContain('inset 0 0 0 1.5px rgba(1,2,3,0.4)');
    asAndroid(26, () => {
      const legacy = shadow('inset', 'light', { color: 'rgba(1,2,3,0.4)', width: 1.5 });
      expect(legacy.boxShadow).toBeUndefined();
      expect(legacy.borderColor).toBe('rgba(1,2,3,0.4)');
      expect(legacy.borderWidth).toBe(1.5);
    });
  });
});

describe("shadow('none')", () => {
  test('is no depth at all — no ghost border on legacy Android', () => {
    expect(shadow('none', 'light')).toEqual({});
    expect(shadow('none', 'dark')).toEqual({});
    asAndroid(28, () => expect(shadow('none', 'light')).toEqual({}));
    asAndroid(26, () => expect(shadow('none', 'dark')).toEqual({}));
  });

  test('but a ring asked for explicitly still draws', () => {
    const ringed = shadow('none', 'light', { color: 'rgba(1,2,3,0.4)' });
    expect(ringed.boxShadow).toBe('inset 0 0 0 1px rgba(1,2,3,0.4)');
    asAndroid(26, () => {
      expect(shadow('none', 'light', { color: 'rgba(1,2,3,0.4)' })).toEqual({
        borderWidth: 1,
        borderColor: 'rgba(1,2,3,0.4)',
      });
    });
  });
});

describe("the 22 px timeline disc (canvas edit #1)", () => {
  test('has its own shallow recipe in both themes', () => {
    expect(shadows.light.disc).toBe('0 4px 10px rgba(13, 13, 13, 0.14)');
    expect(shadows.dark.disc).toBe('0 4px 10px rgba(0, 0, 0, 0.4)');
    // Shallower than the card note it used to borrow.
    expect(shadows.light.disc).not.toBe(shadows.light.note);
  });
});

describe('toneChipShadow() / toneRing() — canvas edit #3', () => {
  test('the due-strip chip geometry, not the KPI tile\'s', () => {
    expect(toneChipShadow('danger', 'light')).toEqual({
      boxShadow: '0 10px 22px rgba(168, 60, 49, 0.2), inset 0 0 0 1px rgba(168, 60, 49, 0.3)',
    });
    expect(toneChipShadow('warning', 'light')).toEqual({
      boxShadow: '0 10px 22px rgba(150, 103, 28, 0.18), inset 0 0 0 1px rgba(150, 103, 28, 0.3)',
    });
    // The KPI tile keeps `--sh-tone-*`.
    expect(toneShadow('danger', 'light')).toBe('0 10px 24px rgba(168, 60, 49, 0.14)');
  });

  test('ring colour is the tone at 30%', () => {
    expect(toneRing('danger')).toBe('rgba(168, 60, 49, 0.3)');
    expect(toneRing('warning')).toBe('rgba(150, 103, 28, 0.3)');
  });

  test('is platform-gated like every other depth', () => {
    asAndroid(28, () => {
      const chip = toneChipShadow('danger', 'light');
      expect(chip.boxShadow).toBe('0 10px 22px rgba(168, 60, 49, 0.2)');
      expect(chip.borderColor).toBe('rgba(168, 60, 49, 0.3)');
    });
    asAndroid(26, () => {
      expect(toneChipShadow('danger', 'light').boxShadow).toBeUndefined();
    });
  });
});

describe('toneShadow()', () => {
  test('tints the drop shadow with the tone, stronger in dark', () => {
    expect(toneShadow('danger', 'light')).toBe('0 10px 24px rgba(168, 60, 49, 0.14)');
    expect(toneShadow('danger', 'dark')).toBe('0 10px 24px rgba(168, 60, 49, 0.3)');
    expect(toneShadow('warning', 'light')).toContain('150, 103, 28');
    expect(toneShadow('success', 'light')).toContain('61, 115, 80');
  });
});

describe('combine()', () => {
  test('joins layers and skips empty ones', () => {
    expect(combine('a', '', 'b')).toBe('a, b');
    expect(combine('', '')).toBe('');
  });
});
