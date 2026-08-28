import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ProductBrowseScreen } from '@/features/products/screens/ProductBrowseScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { useDraftStore } from '@/features/orders/store/draft';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  useDraftStore.setState({ lines: {} });
  mockNavigate.mockClear();
});
afterAll(() => server.close());

const categoriesHandler = () =>
  http.get('http://localhost:8000/api/v1/categories', () =>
    HttpResponse.json({ items: [{ id: 'cat1', name: 'Tees', parent_id: null, is_active: true }], total: 1 }));

const productListItem = {
  id: 'p1', code: 'TSH-001', name: 'Classic Tee', category_id: 'cat1', category_name: 'Tees',
  brand_id: null, brand_name: null, uom: 'Nos', has_variants: true, is_active: true, variant_count: 3,
};

const productDetail = {
  id: 'p1', code: 'TSH-001', name: 'Classic Tee', description: null,
  category_id: 'cat1', category_name: 'Tees', brand_id: null, brand_name: null, uom: 'Nos',
  hsn: { id: 'h1', code: '6109', active_rate: '5' },
  inventory_enabled: true, has_variants: true, is_active: true,
  images: [], size_chart_image: null, specifications: [],
  attributes: [{ id: 'a-size', name: 'Size', family: null, display_type: 'text', position: 1 }],
  variants: [
    {
      id: 'v1', sku: 'TSH-001-M', barcode: null, is_default: true, is_active: true, in_use: false,
      attribute_values: [{ attribute_id: 'a-size', attribute_name: 'Size', value_id: 'vs-m', value: 'M', display_type: 'text', display_value: null }],
      price: { selling_price: '499.00', tax_inclusive: false, effective_from: '2026-01-01' },
      images: [], stock: { actual: '20', reserved: '0', available: '20' },
    },
  ],
};

// The picker re-edit test needs a second size to take *back* to zero — the
// single-variant `productDetail` above can only ever add.
const sizeValue = (valueId: string, value: string) => [
  { attribute_id: 'a-size', attribute_name: 'Size', value_id: valueId, value, display_type: 'text', display_value: null },
];

const twoSizeDetail = {
  ...productDetail,
  variants: [
    { ...productDetail.variants[0]!, id: 'v1', sku: 'TSH-001-M', attribute_values: sizeValue('vs-m', 'M') },
    { ...productDetail.variants[0]!, id: 'v2', sku: 'TSH-001-L', is_default: false, attribute_values: sizeValue('vs-l', 'L') },
  ],
};

const snapshot = (sku: string, variantLabel: string) => ({
  sku, productId: 'p1', productName: 'Classic Tee', variantLabel,
  attributeValues: [], taxRate: '5',
  price: { sellingPrice: '499.00', taxInclusive: false }, stock: null,
});

function productsHandler(onQuery?: (search: URLSearchParams) => void) {
  return http.get('http://localhost:8000/api/v1/products', ({ request }) => {
    const url = new URL(request.url);
    onQuery?.(url.searchParams);
    if (url.searchParams.get('q') === 'jackt') return HttpResponse.json({ items: [], total: 0 });
    return HttpResponse.json({ items: [productListItem], total: 1 });
  });
}

const productDetailHandler = () =>
  http.get('http://localhost:8000/api/v1/products/p1', () => HttpResponse.json(productDetail));

// The SKU-typeahead regex (`/[A-Z0-9-]{3,}/i`) matches any 3+ letter word,
// case-insensitively — both "tee" and "jackt" below trigger a `/variants`
// lookup alongside `/products`, same as it would on device. Always mocked so
// it never turns into an unhandled-request error in a test that isn't about it.
const variantsHandler = () => http.get('http://localhost:8000/api/v1/variants', () => HttpResponse.json({ items: [], total: 0 }));

test('renders category chips, opens a product picker on tap, searches, and shows an empty state', async () => {
  const queries: string[] = [];
  server.use(categoriesHandler(), productsHandler((s) => queries.push(s.toString())), productDetailHandler(), variantsHandler());

  const { findAllByText, findByText, getByPlaceholderText } = await render(
    <Providers>
      <ProductBrowseScreen />
    </Providers>,
  );

  // Category chips render uppercase (`Text variant="chip"`).
  expect(await findByText('TEES')).toBeTruthy();
  expect(await findByText('Classic Tee')).toBeTruthy();

  await fireEvent.press((await findAllByText('Classic Tee'))[0]!);
  await waitFor(async () => {
    expect((await findAllByText('Classic Tee')).length).toBeGreaterThan(1);
  });

  await fireEvent.changeText(getByPlaceholderText('Search products or SKU'), 'tee');
  await waitFor(() => expect(queries.some((q) => q.includes('q=tee'))).toBe(true));

  await fireEvent.changeText(getByPlaceholderText('Search products or SKU'), 'jackt');
  await waitFor(() => expect(queries.some((q) => q.includes('q=jackt'))).toBe(true));

  expect(await findByText('No products found for "jackt"')).toBeTruthy();
  await fireEvent.press(await findByText('CLEAR SEARCH'));
  await waitFor(() => expect(queries.some((q) => q.includes('q=jackt'))).toBe(true));
  expect(await findByText('Classic Tee')).toBeTruthy();
});

test('a SKU-like query also shows matching variants, opening the owning product with that variant preselected', async () => {
  server.use(
    categoriesHandler(),
    productsHandler(),
    productDetailHandler(),
    http.get('http://localhost:8000/api/v1/variants', ({ request }) => {
      expect(new URL(request.url).search).toContain('q=TSH-001-M');
      return HttpResponse.json({
        items: [{
          variant_id: 'v1', sku: 'TSH-001-M', product_id: 'p1', product_code: 'TSH-001', product_name: 'Classic Tee',
          variant_label: 'M', attribute_values: [], hsn_id: 'h1', hsn_code: '6109', tax_rate: '5',
          price: { selling_price: '499.00', tax_inclusive: false }, stock: { actual: '20', reserved: '0', available: '20' },
          is_active: true, inventory_enabled: true,
        }],
        total: 1,
      });
    }),
  );

  const { findByText, findAllByText, getByPlaceholderText } = await render(
    <Providers>
      <ProductBrowseScreen />
    </Providers>,
  );

  await fireEvent.changeText(getByPlaceholderText('Search products or SKU'), 'TSH-001-M');

  expect(await findByText('SKU MATCHES')).toBeTruthy(); // Text variant="label" auto-uppercases
  expect(await findByText('TSH-001-M')).toBeTruthy();

  await fireEvent.press(await findByText('TSH-001-M'));
  await waitFor(async () => {
    expect((await findAllByText('Classic Tee')).length).toBeGreaterThan(0);
  });
});

test('SKU matches never offer an inactive variant (the backend deliberately includes them for historical lookups)', async () => {
  server.use(
    categoriesHandler(),
    productsHandler(),
    productDetailHandler(),
    http.get('http://localhost:8000/api/v1/variants', ({ request }) => {
      expect(new URL(request.url).search).toContain('q=TSH-001');
      return HttpResponse.json({
        items: [
          {
            variant_id: 'v1', sku: 'TSH-001-M', product_id: 'p1', product_code: 'TSH-001', product_name: 'Classic Tee',
            variant_label: 'M', attribute_values: [], hsn_id: 'h1', hsn_code: '6109', tax_rate: '5',
            price: { selling_price: '499.00', tax_inclusive: false }, stock: { actual: '20', reserved: '0', available: '20' },
            is_active: true, inventory_enabled: true,
          },
          {
            variant_id: 'v2', sku: 'TSH-001-XL', product_id: 'p1', product_code: 'TSH-001', product_name: 'Classic Tee',
            variant_label: 'XL', attribute_values: [], hsn_id: 'h1', hsn_code: '6109', tax_rate: '5',
            price: null, stock: null,
            is_active: false, inventory_enabled: true,
          },
        ],
        total: 2,
      });
    }),
  );

  const { findByText, queryByText, getByPlaceholderText } = await render(
    <Providers>
      <ProductBrowseScreen />
    </Providers>,
  );

  await fireEvent.changeText(getByPlaceholderText('Search products or SKU'), 'TSH-001');

  expect(await findByText('TSH-001-M')).toBeTruthy();
  expect(queryByText('TSH-001-XL')).toBeNull();
});

// Re-opening a product's picker edits that product's whole set of lines. A size
// taken back to 0 has to *leave* the cart — before this, "Add to order" only
// ever merged what was still picked, so the zeroed line kept its old quantity
// and the rep had no way to undo a size except swiping it off the cart screen.
test('re-editing a product through the picker removes a size taken back to zero', async () => {
  server.use(
    categoriesHandler(),
    productsHandler(),
    http.get('http://localhost:8000/api/v1/products/p1', () => HttpResponse.json(twoSizeDetail)),
    variantsHandler(),
  );
  useDraftStore.getState().addLines([
    { variantId: 'v1', qty: 12, snapshot: snapshot('TSH-001-M', 'M') },
    { variantId: 'v2', qty: 8, snapshot: snapshot('TSH-001-L', 'L') },
  ]);

  const { findByText, findByLabelText } = await render(
    <Providers>
      <ProductBrowseScreen />
    </Providers>,
  );

  // The "in this order" row's pencil re-opens the picker with both sizes on.
  await fireEvent.press(await findByLabelText('Edit Classic Tee'));
  const lStepper = await findByLabelText('TSH-001-L');
  expect(lStepper.props.value).toBe('8');

  await fireEvent.changeText(lStepper, '0');
  await fireEvent(lStepper, 'blur');
  await fireEvent.press(await findByText('ADD TO ORDER'));

  await waitFor(() => expect(Object.keys(useDraftStore.getState().lines)).toEqual(['v1']));
  expect(useDraftStore.getState().lines.v1!.qty).toBe(12);
});

// M4-T7 (frames `products-loading` / `wizard-2-products`): the grid loads as a
// 2-column skeleton grid at the cards' own size, so nothing jumps as the real
// products arrive.
test('the grid shows a skeleton grid while loading, then the product cards', async () => {
  let release: (() => void) | null = null;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    categoriesHandler(),
    variantsHandler(),
    productDetailHandler(),
    http.get('http://localhost:8000/api/v1/products', async () => {
      await gate;
      return HttpResponse.json({ items: [productListItem], total: 1 });
    }),
  );

  const { findByTestId, findByText, queryByTestId } = await render(
    <Providers>
      <ProductBrowseScreen />
    </Providers>,
  );

  expect(await findByTestId('product-grid-skeleton')).toBeTruthy();

  release!();

  expect(await findByText('Classic Tee')).toBeTruthy();
  expect(await findByText('TSH-001 · 3 variants')).toBeTruthy();
  await waitFor(() => expect(queryByTestId('product-grid-skeleton')).toBeNull());
});
