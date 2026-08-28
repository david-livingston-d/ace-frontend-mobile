import React from 'react';
import { render } from '@testing-library/react-native';
import { Home } from 'lucide-react-native';
import {
  Avatar,
  HeroTile,
  IconDisc,
  MediaFrame,
  MetricsStrip,
  SettingsGroup,
  SettingsRow,
  Skeleton,
  initialsOf,
} from '@/ui';
import { ThemeProvider } from '@/ui/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

// The SVG-backed primitives (gradients, shimmer) are the ones most likely to
// break silently — nothing else in the app draws with react-native-svg. These
// mount them so a regression shows up here rather than on a device three tasks
// later, when Home/Products/More adopt them.

test('initials come from the first and last word', () => {
  expect(initialsOf('Ravi Kumar Singh')).toBe('RS');
  expect(initialsOf('Divya')).toBe('D');
  expect(initialsOf('   ')).toBe('?');
});

test('HeroTile renders its label, value and hint', async () => {
  const { getByText } = await wrap(<HeroTile label="Open orders" value="6" hint="2 due today" />);
  expect(getByText('OPEN ORDERS')).toBeTruthy();
  expect(getByText('6')).toBeTruthy();
  expect(getByText('2 due today')).toBeTruthy();
});

test('Avatar renders initials and is labelled with the name', async () => {
  const { getByText, getByLabelText } = await wrap(<Avatar name="M2 Dev Check" />);
  expect(getByText('MC')).toBeTruthy();
  expect(getByLabelText('M2 Dev Check')).toBeTruthy();
});

test('MediaFrame falls back to initials with no image', async () => {
  const { getByText } = await wrap(<MediaFrame initials="CT" />);
  expect(getByText('CT')).toBeTruthy();
});

test('MetricsStrip renders a label/value pair per item', async () => {
  const { getByText } = await wrap(
    <MetricsStrip items={[{ label: 'Qty', value: '100' }, { label: 'To collect', value: '₹40,000.00', tone: 'danger' }]} />,
  );
  expect(getByText('QTY')).toBeTruthy();
  expect(getByText('₹40,000.00')).toBeTruthy();
});

test('SettingsGroup renders its rows inside one card', async () => {
  const { getByText } = await wrap(
    <SettingsGroup title="Account">
      <SettingsRow title="My activity" subtitle="Orders you've worked on" chevron onPress={jest.fn()} />
      <SettingsRow title="Log out" destructive onPress={jest.fn()} />
    </SettingsGroup>,
  );
  expect(getByText('ACCOUNT')).toBeTruthy();
  expect(getByText('My activity')).toBeTruthy();
  expect(getByText('Log out')).toBeTruthy();
});

test('IconDisc and Skeleton mount', async () => {
  const { toJSON } = await wrap(
    <>
      <IconDisc icon={Home} />
      <IconDisc icon={Home} size={22} />
      <Skeleton width={120} height={14} />
    </>,
  );
  expect(toJSON()).toBeTruthy();
});
