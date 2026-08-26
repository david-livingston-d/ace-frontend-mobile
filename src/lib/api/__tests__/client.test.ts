import { redactPath } from '@/lib/api/client';
test('UUID path segments are redacted for analytics', () => {
  expect(redactPath('/sales-orders/0b7a2f44-9a3e-4f1a-8c1d-1d2e3f4a5b6c/pdf')).toBe('/sales-orders/{id}/pdf');
});
