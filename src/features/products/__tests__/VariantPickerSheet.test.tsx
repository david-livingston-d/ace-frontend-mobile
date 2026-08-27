import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { VariantPickerSheet } from '../components/VariantPickerSheet';
import { Providers } from '@/providers';
import type { ProductDetail } from '../types';

// @testing-library/react-native v14's `render`/`fireEvent` are async (built on the
// new `test-renderer` package).

function variant(overrides: Partial<ProductDetail['variants'][number]>): ProductDetail['variants'][number] {
  return {
    id: 'var-x', sku: 'SKU-X', barcode: null, is_default: false, is_active: true, in_use: false,
    attribute_values: [],
    price: { selling_price: '499.00', tax_inclusive: false, effective_from: '2026-01-01' },
    images: [],
    stock: { actual: '50', reserved: '0', available: '50' },
    ...overrides,
  };
}

// Color × Size product: Black in S/M/L (L has low stock) + an *inactive*
// Black/XL (must never be offered) + White/M.
const product: ProductDetail = {
  id: 'p1', code: 'TSH-001', name: 'Classic Tee', description: null,
  category_id: null, category_name: null, brand_id: null, brand_name: null, uom: 'Nos',
  // A non-zero rate here is deliberate: the footer must show the *tax-exclusive*
  // total (see "Excl. GST" in the sheet) — if the footer accidentally added tax,
  // this rate would make that visible.
  hsn: { id: 'h1', code: '6109', active_rate: '5' },
  inventory_enabled: true, has_variants: true, is_active: true,
  images: [], size_chart_image: null, specifications: [],
  attributes: [
    { id: 'a-color', name: 'Color', family: null, display_type: 'color', position: 1 },
    { id: 'a-size', name: 'Size', family: null, display_type: 'text', position: 2 },
  ],
  variants: [
    variant({
      id: 'var-blk-s', sku: 'WH-TEE-BLK-S', is_default: true,
      attribute_values: [
        { attribute_id: 'a-color', attribute_name: 'Color', value_id: 'v-black', value: 'Black', display_type: 'color', display_value: '#111111' },
        { attribute_id: 'a-size', attribute_name: 'Size', value_id: 'v-s', value: 'S', display_type: 'text', display_value: null },
      ],
    }),
    variant({
      id: 'var-blk-m', sku: 'WH-TEE-BLK-M',
      attribute_values: [
        { attribute_id: 'a-color', attribute_name: 'Color', value_id: 'v-black', value: 'Black', display_type: 'color', display_value: '#111111' },
        { attribute_id: 'a-size', attribute_name: 'Size', value_id: 'v-m', value: 'M', display_type: 'text', display_value: null },
      ],
    }),
    variant({
      id: 'var-blk-l', sku: 'WH-TEE-BLK-L',
      attribute_values: [
        { attribute_id: 'a-color', attribute_name: 'Color', value_id: 'v-black', value: 'Black', display_type: 'color', display_value: '#111111' },
        { attribute_id: 'a-size', attribute_name: 'Size', value_id: 'v-l', value: 'L', display_type: 'text', display_value: null },
      ],
      stock: { actual: '5', reserved: '0', available: '5' },
    }),
    variant({
      id: 'var-blk-xl', sku: 'WH-TEE-BLK-XL', is_active: false,
      attribute_values: [
        { attribute_id: 'a-color', attribute_name: 'Color', value_id: 'v-black', value: 'Black', display_type: 'color', display_value: '#111111' },
        { attribute_id: 'a-size', attribute_name: 'Size', value_id: 'v-xl', value: 'XL', display_type: 'text', display_value: null },
      ],
    }),
    variant({
      id: 'var-wht-m', sku: 'WH-TEE-WHT-M',
      attribute_values: [
        { attribute_id: 'a-color', attribute_name: 'Color', value_id: 'v-white', value: 'White', display_type: 'color', display_value: '#ffffff' },
        { attribute_id: 'a-size', attribute_name: 'Size', value_id: 'v-m', value: 'M', display_type: 'text', display_value: null },
      ],
    }),
  ],
};

const wrap = (ui: React.ReactElement) => render(<Providers>{ui}</Providers>);

test('picking sizes under a colour reveals steppers; setting quantities updates the footer and onAdd', async () => {
  const onAdd = jest.fn();
  const { findByText, findByLabelText, queryByLabelText, queryByText } = await wrap(
    <VariantPickerSheet product={product} initial={{}} onAdd={onAdd} />,
  );

  expect(await findByText('Classic Tee')).toBeTruthy();

  await fireEvent.press(await findByText('Black'));
  await fireEvent.press(await findByText('M'));
  await fireEvent.press(await findByText('L'));

  // The inactive Black/XL combination is never offered as a chip or a row.
  expect(queryByText('XL')).toBeNull();
  expect(queryByLabelText('WH-TEE-BLK-XL')).toBeNull();

  const mStepper = await findByLabelText('WH-TEE-BLK-M');
  const lStepper = await findByLabelText('WH-TEE-BLK-L');

  await fireEvent.changeText(mStepper, '10');
  await fireEvent(mStepper, 'blur');
  await fireEvent.changeText(lStepper, '8');
  await fireEvent(lStepper, 'blur');

  expect(await findByText('18 units · ₹8,982.00')).toBeTruthy();

  await fireEvent.press(await findByText('ADD TO ORDER'));

  expect(onAdd).toHaveBeenCalledTimes(1);
  const lines = onAdd.mock.calls[0][0];
  expect(lines).toHaveLength(2);
  expect(lines.find((l: { variantId: string }) => l.variantId === 'var-blk-m')).toMatchObject({
    qty: 10,
    snapshot: { sku: 'WH-TEE-BLK-M', productId: 'p1', productName: 'Classic Tee', taxRate: '5', variantLabel: 'Black / M' },
  });
  expect(lines.find((l: { variantId: string }) => l.variantId === 'var-blk-l')).toMatchObject({ qty: 8 });
});

test('an inactive variant is never offered under any colour', async () => {
  const { findByText, queryByText } = await wrap(<VariantPickerSheet product={product} initial={{}} onAdd={jest.fn()} />);
  await fireEvent.press(await findByText('Black'));
  expect(queryByText('XL')).toBeNull();
  await fireEvent.press(await findByText('White'));
  expect(queryByText('XL')).toBeNull();
});

test('initial quantities pre-select the chip and prefill its stepper', async () => {
  const { findByLabelText, findByText } = await wrap(
    <VariantPickerSheet product={product} initial={{ 'var-blk-m': 3 }} onAdd={jest.fn()} />,
  );
  const stepper = await findByLabelText('WH-TEE-BLK-M');
  expect(stepper.props.value).toBe('3');
  expect(await findByText('3 units · ₹1,497.00')).toBeTruthy();
});

test("initial quantities for a non-default colour restore that colour chip, not axis-1's first value", async () => {
  // `product`'s axis-1 (Color) values are seen in variant order: Black first
  // (from var-blk-s), White second (from var-wht-m) — so without seeding from
  // `initial`, the sheet would default to the Black chip regardless of which
  // colour is actually prefilled, and axis-2's options (derived from the
  // selected colour) would show Black's sizes instead of White's.
  const { findByLabelText, findByText, getByRole } = await wrap(
    <VariantPickerSheet product={product} initial={{ 'var-wht-m': 5 }} onAdd={jest.fn()} />,
  );
  await findByText('Classic Tee');

  // The White chip (not Black) is selected on open.
  expect(getByRole('button', { name: 'White' }).props.accessibilityState.selected).toBe(true);
  expect(getByRole('button', { name: 'Black' }).props.accessibilityState.selected).toBe(false);

  // Its size chip (M — White's only size here) is selected too, and the row is prefilled.
  expect(getByRole('button', { name: 'M' }).props.accessibilityState.selected).toBe(true);
  const stepper = await findByLabelText('WH-TEE-WHT-M');
  expect(stepper.props.value).toBe('5');
  expect(await findByText('5 units · ₹2,495.00')).toBeTruthy();
});
