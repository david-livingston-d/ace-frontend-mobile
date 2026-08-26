import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusChip } from '@/ui/StatusChip';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { light } from '@/ui/tokens/colors';

// @testing-library/react-native v14's `render` is async (built on the new
// `test-renderer` package) — adapted with await; assertion is unchanged from the brief.
test('maps a tone to the semantic colour pair', async () => {
  const { getByText } = await render(<ThemeProvider><StatusChip tone="danger" label="Overdue" /></ThemeProvider>);
  const node = getByText('OVERDUE');
  expect(node.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: light.tone.danger.fg })]));
});
