import { createMMKV } from 'react-native-mmkv';
import { useOrderDraft } from '@/features/orders/store/draft';

// A draft persisted before `hydratedSignature`/`hydratedOrderDiscountPct`
// existed (v0) has neither key at all — this seeds the same MMKV store
// `mmkvStorage('draft')` reads from directly (bypassing every store action),
// so `persist.rehydrate()` below reads back exactly what a real v0 blob on a
// device would look like.
test('a v0 persisted blob without hydratedSignature/hydratedOrderDiscountPct rehydrates with v1 defaults', async () => {
  const mmkv = createMMKV({ id: 'draft' });
  mmkv.set(
    'draft',
    JSON.stringify({
      state: {
        editOrderId: 'o9',
        customer: null,
        billingAddressId: null,
        shippingAddressId: null,
        paymentTermsId: null,
        expectedDeliveryDate: null,
        remarks: 'from before the migration existed',
        orderDiscountPct: '0',
        lines: {},
      },
      version: 0,
    }),
  );

  await useOrderDraft.persist.rehydrate();

  const state = useOrderDraft.getState();
  expect(state.editOrderId).toBe('o9');
  expect(state.remarks).toBe('from before the migration existed');
  expect(state.hydratedSignature).toBeNull();
  expect(state.hydratedOrderDiscountPct).toBeNull();
});

test('a v1 blob that already carries both fields is left alone', async () => {
  const mmkv = createMMKV({ id: 'draft' });
  mmkv.set(
    'draft',
    JSON.stringify({
      state: {
        editOrderId: 'o10',
        customer: null,
        billingAddressId: null,
        shippingAddressId: null,
        paymentTermsId: null,
        expectedDeliveryDate: null,
        remarks: '',
        orderDiscountPct: '0',
        lines: {},
        hydratedSignature: '[]',
        hydratedOrderDiscountPct: '5',
      },
      version: 1,
    }),
  );

  await useOrderDraft.persist.rehydrate();

  const state = useOrderDraft.getState();
  expect(state.editOrderId).toBe('o10');
  expect(state.hydratedSignature).toBe('[]');
  expect(state.hydratedOrderDiscountPct).toBe('5');
});
