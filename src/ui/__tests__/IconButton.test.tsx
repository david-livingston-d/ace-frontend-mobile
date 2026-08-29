import React from 'react';
import { render } from '@testing-library/react-native';
import { X } from 'lucide-react-native';
import { IconButton } from '@/ui';
import { ThemeProvider } from '@/ui/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

/** What each size *draws*, mirroring `DIMENSIONS` in the component. */
const DRAWN = { sm: 32, md: 42, lg: 44 } as const;

describe('IconButton hit areas', () => {
  test.each(['sm', 'md', 'lg'] as const)('size=%s reaches at least 44 x 44', async (size) => {
    const { getByLabelText } = await wrap(
      <IconButton icon={X} label="Clear" size={size} onPress={() => {}} />,
    );
    const slop = getByLabelText('Clear').props.hitSlop as {
      top: number; bottom: number; left: number; right: number;
    };
    expect(DRAWN[size] + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
    expect(DRAWN[size] + slop.left + slop.right).toBeGreaterThanOrEqual(44);
  });

  test('the slop is per size, not one shared value', async () => {
    async function slopFor(size: 'sm' | 'md' | 'lg') {
      const { getByLabelText } = await wrap(
        <IconButton icon={X} label="Clear" size={size} onPress={() => {}} />,
      );
      return getByLabelText('Clear').props.hitSlop;
    }
    // 32 -> 44, 42 -> 44, 44 already there.
    expect(await slopFor('sm')).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
    expect(await slopFor('md')).toEqual({ top: 1, bottom: 1, left: 1, right: 1 });
    expect(await slopFor('lg')).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});
