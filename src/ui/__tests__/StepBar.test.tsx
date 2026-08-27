import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { StepBar } from '@/ui/StepBar';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);
const STEPS = ['Draft', 'Submitted', 'Delivered'];

test('renders every step label and highlights the current one', async () => {
  const { getByText } = await wrap(<StepBar steps={STEPS} current={1} />);
  for (const step of STEPS) expect(getByText(step)).toBeTruthy();
});

test('shows no CONTINUE action when onContinue is not given', async () => {
  const { queryByText } = await wrap(<StepBar steps={STEPS} current={0} />);
  expect(queryByText('CONTINUE')).toBeNull();
});

test('shows and fires the continue action when given', async () => {
  const onContinue = jest.fn();
  const { getByText } = await wrap(
    <StepBar steps={STEPS} current={0} continueLabel="Continue" onContinue={onContinue} />,
  );
  await fireEvent.press(getByText('CONTINUE'));
  expect(onContinue).toHaveBeenCalled();
});
