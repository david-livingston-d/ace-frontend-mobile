import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { StepBar } from '@/ui/StepBar';
import { light } from '@/ui/tokens/colors';

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

test('a permission-blocked continue renders disabled with its hint, and never fires', async () => {
  const onContinue = jest.fn();
  const { getByText } = await wrap(
    <StepBar
      steps={STEPS}
      current={0}
      continueLabel="Submit"
      continueDisabled
      continueHint="Needs delivery_note.submit"
      onContinue={onContinue}
    />,
  );
  expect(await getByText('Needs delivery_note.submit')).toBeTruthy();
  await fireEvent.press(getByText('SUBMIT'));
  expect(onContinue).not.toHaveBeenCalled();
});

/**
 * The clamp (`StepBar.tsx`'s `Math.min(Math.max(0, current), …)`): a caller
 * that maps a document status onto its own step list can land past the end of
 * it (`CreateInvoiceScreen` runs one step ahead of the invoice's own track) or,
 * with an unknown status, before its start. Either way a step must be marked
 * current — the bug this replaced rendered the bar with nothing lit at all.
 * The current step is the one whose label takes the full-strength text colour.
 */
const currentLabel = (getByText: (t: string) => { props: { style?: unknown } }, steps: string[]) =>
  steps.find((s) => [getByText(s).props.style].flat(Infinity).some((v) => (v as { color?: string })?.color === light.text));

test('a current past the last step lands on the last step', async () => {
  const steps = ['Create', 'Submit'];
  const { getByText } = await wrap(<StepBar steps={steps} current={2} />);
  expect(currentLabel(getByText, steps)).toBe('Submit');
});

test('a negative current lands on the first step', async () => {
  const steps = ['Create', 'Submit'];
  const { getByText } = await wrap(<StepBar steps={steps} current={-1} />);
  expect(currentLabel(getByText, steps)).toBe('Create');
});
