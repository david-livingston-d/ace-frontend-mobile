import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Select } from '@/ui/Select';
import { Providers } from '@/providers';

const OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Only mine', value: 'mine' },
];

test("renders the selected option's label", async () => {
  const { getByText } = await render(
    <Providers>
      <Select label="Scope" value="mine" options={OPTIONS} onChange={jest.fn()} />
    </Providers>,
  );
  expect(getByText('Only mine')).toBeTruthy();
});

test('pressing opens the sheet and choosing an option calls onChange(value)', async () => {
  const onChange = jest.fn();
  const { getByLabelText, findByText } = await render(
    <Providers>
      <Select label="Scope" value="mine" options={OPTIONS} onChange={onChange} />
    </Providers>,
  );
  await fireEvent.press(getByLabelText('Scope'));
  await fireEvent.press(await findByText('All statuses'));
  expect(onChange).toHaveBeenCalledWith('all');
});
