import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import { render } from '@testing-library/react-native';
import { FieldShell } from '@/ui/FieldShell';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { light } from '@/ui/tokens/colors';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

test('renders the label uppercased and the helper text', async () => {
  const { getByText } = await wrap(
    <FieldShell label="Amount" helper="₹1,234.50"><RNText>body</RNText></FieldShell>,
  );
  expect(getByText('AMOUNT')).toBeTruthy();
  expect(getByText('₹1,234.50')).toBeTruthy();
});

test('an error replaces the helper and tints the ring', async () => {
  const { getByText, getByTestId } = await wrap(
    <FieldShell label="Amount" helper="₹0.00" error="Enter an amount"><RNText>body</RNText></FieldShell>,
  );
  expect(getByText('Enter an amount')).toBeTruthy();
  const box = StyleSheet.flatten(getByTestId('field-box').props.style);
  expect(String(box.boxShadow)).toContain(light.errRing);
});

test('focus draws the jet ring', async () => {
  const { getByTestId } = await wrap(
    <FieldShell label="Amount" focused><RNText>body</RNText></FieldShell>,
  );
  const box = StyleSheet.flatten(getByTestId('field-box').props.style);
  expect(String(box.boxShadow)).toContain(`inset 0 0 0 1.5px ${light.focus}`);
});

test('the sm size draws a shorter box than md', async () => {
  const md = await wrap(<FieldShell><RNText>a</RNText></FieldShell>);
  const sm = await wrap(<FieldShell size="sm"><RNText>a</RNText></FieldShell>);
  const mdBox = StyleSheet.flatten(md.getByTestId('field-box').props.style);
  const smBox = StyleSheet.flatten(sm.getByTestId('field-box').props.style);
  expect(Number(smBox.minHeight)).toBeLessThan(Number(mdBox.minHeight));
});
