import React from 'react';
import { render } from '@testing-library/react-native';
import { Chip } from '@/ui/Chip';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { typography } from '@/ui/tokens/typography';

// M4-T6 fix 1: canvas edit #3 sizes the due-strip count at 13/700. Poppins-Bold
// is not bundled (and the brief forbids adding a font), so `rowTitle` — 13/600 —
// is the ceiling; what matters here is that it is the 13 px role and not the
// 12 px `rowStrong` the chip shipped with.
test('a count chip sets its number in the 13 px row-title role', async () => {
  const { getByText } = await render(
    <ThemeProvider><Chip count={3} label="Overdue" tone="danger" /></ThemeProvider>,
  );
  expect(getByText('3').props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ fontSize: typography.rowTitle.fontSize })]),
  );
  expect(typography.rowTitle.fontSize).toBeGreaterThan(typography.rowStrong.fontSize);
});
