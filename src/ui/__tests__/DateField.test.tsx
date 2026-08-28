import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DateField } from '@/ui/DateField';
import { ThemeProvider } from '@/ui/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

// `Platform.OS` is 'ios' by default under the react-native Jest preset, so the
// Android-path suite has to say so explicitly; both suites restore it.
const ORIGINAL_OS = Platform.OS;
afterEach(() => {
  Platform.OS = ORIGINAL_OS;
});

describe('on Android', () => {
  beforeEach(() => {
    Platform.OS = 'android';
  });
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

  test('Android mounts the picker only while open, as the platform dialog', async () => {
    expect(Platform.OS).toBe('android');
    const { getByLabelText, getByTestId, queryByTestId } = await wrap(
      <DateField label="From" value="2026-08-12" onChange={jest.fn()} />,
    );
    expect(queryByTestId('date-time-picker')).toBeNull();
    await fireEvent.press(getByLabelText('From'));
    expect(getByTestId('date-time-picker').props.display).toBe('default');
    // No sheet on Android — the picker presents itself as a modal dialog.
    expect(queryByTestId('date-picker-panel')).toBeNull();
  });
});

describe('on iOS', () => {
  // iOS renders `DateTimePicker` inline (it pushes the rest of the form down)
  // and a spinner reports every intermediate scroll position as a 'set' event,
  // so `DateField` puts it in a bottom panel behind an explicit Done.
  beforeEach(() => {
    Platform.OS = 'ios';
  });

  test('the picker is a spinner in a bottom panel, mounted only once the field is pressed', async () => {
    const { getByLabelText, getByText, getByTestId, queryByTestId } = await wrap(
      <DateField label="Committed delivery" value="2026-08-12" onChange={jest.fn()} />,
    );
    expect(queryByTestId('date-picker-panel')).toBeNull();
    expect(queryByTestId('date-time-picker')).toBeNull();

    await fireEvent.press(getByLabelText('Committed delivery'));

    expect(getByTestId('date-time-picker').props.display).toBe('spinner');
    expect(getByTestId('date-picker-panel')).toBeTruthy();
    // `Button`'s label renders uppercase (`Text variant="label"`).
    expect(getByText('DONE')).toBeTruthy();
  });

  test('scrolling the spinner does not commit; Done commits the last scrolled value', async () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = await wrap(
      <DateField label="Committed delivery" value={null} onChange={onChange} />,
    );
    await fireEvent.press(getByLabelText('Committed delivery'));

    const mock = DateTimePicker as unknown as { __trigger: (event: { type: string }, date?: Date) => void };
    // The iOS spinner reports every intermediate position as a 'set' event —
    // `act` so each one lands in the component's draft state, as on device.
    await act(async () => {
      mock.__trigger({ type: 'set' }, new Date(2026, 7, 10));
    });
    await act(async () => {
      mock.__trigger({ type: 'set' }, new Date(2026, 7, 12));
    });
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.press(getByText('DONE'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2026-08-12');
  });

  test('dismissing the panel by its backdrop leaves the value alone', async () => {
    const onChange = jest.fn();
    const { getByLabelText, queryByTestId } = await wrap(
      <DateField label="Committed delivery" value="2026-08-01" onChange={onChange} />,
    );
    await fireEvent.press(getByLabelText('Committed delivery'));
    const mock = DateTimePicker as unknown as { __trigger: (event: { type: string }, date?: Date) => void };
    await act(async () => {
      mock.__trigger({ type: 'set' }, new Date(2026, 7, 12));
    });

    await fireEvent.press(getByLabelText('Close Committed delivery'));
    expect(onChange).not.toHaveBeenCalled();
    expect(queryByTestId('date-picker-panel')).toBeNull();
  });

  test('Done with no scrolling commits the date the field already showed', async () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = await wrap(
      <DateField label="Committed delivery" value="2026-08-01" onChange={onChange} />,
    );
    await fireEvent.press(getByLabelText('Committed delivery'));
    await fireEvent.press(getByText('DONE'));
    expect(onChange).toHaveBeenCalledWith('2026-08-01');
  });
});
