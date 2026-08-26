import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Stepper } from '@/ui/Stepper';
import { ThemeProvider } from '@/ui/ThemeProvider';

// @testing-library/react-native v14's `render`/`fireEvent` are async (built on the
// new `test-renderer` package) — the brief's tests are adapted with await accordingly;
// assertions and behaviour under test are unchanged from the brief.
const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

test('clamps to min and max and reports changes', async () => {
  const onChange = jest.fn();
  const { getByLabelText } = await wrap(<Stepper value={8} min={0} max={8} onChange={onChange} label="Qty" />);
  await fireEvent.press(getByLabelText('Increase Qty'));
  expect(onChange).not.toHaveBeenCalled();           // already at max
  await fireEvent.press(getByLabelText('Decrease Qty'));
  expect(onChange).toHaveBeenCalledWith(7);
});

test('typing a value outside the range clamps on blur', async () => {
  const onChange = jest.fn();
  const { getByLabelText } = await wrap(<Stepper value={1} min={0} max={5} onChange={onChange} label="Qty" />);
  const input = getByLabelText('Qty');
  await fireEvent.changeText(input, '9');
  await fireEvent(input, 'blur');
  expect(onChange).toHaveBeenLastCalledWith(5);
});
