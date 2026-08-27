import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { MoneyInput, sanitizeMoneyInput } from '@/ui/MoneyInput';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('sanitizeMoneyInput', () => {
  test('passes a plain decimal through unchanged', () => {
    expect(sanitizeMoneyInput('1234.5')).toBe('1234.5');
  });

  test('drops letters', () => {
    expect(sanitizeMoneyInput('12a3b4')).toBe('1234');
  });

  test('drops a second dot', () => {
    expect(sanitizeMoneyInput('12.3.4')).toBe('12.34');
  });

  test('caps at two fractional digits', () => {
    expect(sanitizeMoneyInput('12.3456')).toBe('12.34');
  });
});

test('typing commits the sanitized value via onChange every time', async () => {
  const onChange = jest.fn();
  const { getByLabelText } = await wrap(<MoneyInput label="Amount" value="" onChange={onChange} />);
  await fireEvent.changeText(getByLabelText('Amount'), '1234.5');
  expect(onChange).toHaveBeenCalledWith('1234.5');
});

test('rejects a second "." and letters as they are typed', async () => {
  const onChange = jest.fn();
  const { getByLabelText } = await wrap(<MoneyInput label="Amount" value="" onChange={onChange} />);
  await fireEvent.changeText(getByLabelText('Amount'), '12.3.4x');
  expect(onChange).toHaveBeenCalledWith('12.34');
});

test('shows the formatted amount as helper text', async () => {
  const { getByText } = await wrap(<MoneyInput label="Amount" value="1234.5" onChange={jest.fn()} />);
  expect(getByText('₹1,234.50')).toBeTruthy();
});

test('uses the decimal-pad keyboard', async () => {
  const { getByLabelText } = await wrap(<MoneyInput label="Amount" value="" onChange={jest.fn()} />);
  expect(getByLabelText('Amount').props.keyboardType).toBe('decimal-pad');
});
