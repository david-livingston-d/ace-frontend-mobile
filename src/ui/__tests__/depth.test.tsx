import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Clock } from 'lucide-react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import { Banner, Chip, IconDisc, KpiTile } from '@/ui';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { shadows, toneChipShadow } from '@/ui/tokens/elevation';
import { light } from '@/ui/tokens/colors';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

/** Every `boxShadow` / `borderColor` in a rendered tree, flattened. */
function stylesOf(node: ReactTestRendererJSON | ReactTestRendererJSON[] | null): Record<string, unknown>[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(stylesOf);
  const own = StyleSheet.flatten(node.props?.style) as Record<string, unknown> | undefined;
  const children = (node.children ?? []).filter(
    (c): c is ReactTestRendererJSON => typeof c === 'object' && c !== null,
  );
  return [...(own ? [own] : []), ...children.flatMap(stylesOf)];
}

async function boxShadows(ui: React.ReactElement): Promise<string[]> {
  const tree = (await wrap(ui)).toJSON() as ReactTestRendererJSON;
  return stylesOf(tree)
    .map((s) => s.boxShadow)
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
}

async function asAndroid(version: number, run: () => Promise<void>) {
  const os = Platform.OS;
  const v = Platform.Version;
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
  try {
    await run();
  } finally {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    Object.defineProperty(Platform, 'Version', { value: v, configurable: true });
  }
}

describe('Chip tone depth (canvas edit #3)', () => {
  test('a toned chip wears the tone chip shadow and ring, not the neutral one', async () => {
    const found = await boxShadows(<Chip label="Overdue" tone="danger" count={3} />);
    expect(found).toContain(toneChipShadow('danger', 'light').boxShadow);
    expect(found).not.toContain(shadows.light.chip);
  });

  test('an untoned chip keeps the neutral recipe', async () => {
    const found = await boxShadows(<Chip label="This week" count={5} />);
    expect(found.some((s) => s.startsWith(shadows.light.chip))).toBe(true);
  });
});

describe('IconDisc (canvas edit #1)', () => {
  test('the 22 px node uses the disc recipe + its own ring', async () => {
    const found = await boxShadows(<IconDisc icon={Clock} size={22} />);
    expect(found).toContain(`${shadows.light.disc}, inset 0 0 0 1px ${light.discRing}`);
  });

  test('the 58 px well is still sunken', async () => {
    expect(await boxShadows(<IconDisc icon={Clock} />)).toContain(shadows.light.inset);
  });
});

describe('KpiTile / Banner go through shadow()', () => {
  test('a toned tile composes the tint onto the gated card shadow', async () => {
    const found = await boxShadows(<KpiTile label="Outstanding" value="₹1,00,000" tone="danger" />);
    expect(found.some((s) => s.includes('rgba(168, 60, 49, 0.14)') && s.includes('0 10px 28px'))).toBe(true);
  });

  test('a danger banner rings the note card', async () => {
    const found = await boxShadows(<Banner tone="danger" title="Over credit limit" />);
    expect(found).toContain(`${shadows.light.note}, inset 0 0 0 1px ${light.errRing}`);
  });

  test('neither ships a boxShadow the platform cannot draw (Android 26)', async () => {
    await asAndroid(26, async () => {
      expect(await boxShadows(<KpiTile label="Outstanding" value="₹1" tone="danger" />)).toEqual([]);
      expect(await boxShadows(<Banner tone="danger" title="Over credit limit" />)).toEqual([]);
    });
  });
});
