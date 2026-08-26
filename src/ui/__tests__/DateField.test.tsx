import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DateField } from '@/ui/DateField';
import { ThemeProvider } from '@/ui/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

test('renders formatDate(value) when set, else the placeholder', async () => {
  const { getByText, rerender } = await wrap(
    <DateField label="From" value={null} onChange={jest.fn()} placeholder="Any date" />,
  );
  expect(getByText('Any date')).toBeTruthy();
  await rerender(<ThemeProvider><DateField label="From" value="2026-08-12" onChange={jest.fn()} /></ThemeProvider>);
  expect(getByText('12 Aug 2026')).toBeTruthy();
});

test('picking a date reports it as YYYY-MM-DD', async () => {
  const onChange = jest.fn();
  const { getByLabelText } = await wrap(<DateField label="From" value={null} onChange={onChange} />);
  await fireEvent.press(getByLabelText('From'));
  const mock = DateTimePicker as unknown as { __trigger: (event: { type: string }, date: Date) => void };
  mock.__trigger({ type: 'set' }, new Date(2026, 7, 12));
  expect(onChange).toHaveBeenCalledWith('2026-08-12');
});

test('a "set" event with no date, or a "dismissed" event, does not call onChange', async () => {
  const onChange = jest.fn();
  const { getByLabelText } = await wrap(<DateField label="From" value={null} onChange={onChange} />);
  await fireEvent.press(getByLabelText('From'));
  const mock = DateTimePicker as unknown as { __trigger: (event: { type: string }, date?: Date) => void };
  mock.__trigger({ type: 'dismissed' }, new Date(2026, 7, 12));
  expect(onChange).not.toHaveBeenCalled();
});
