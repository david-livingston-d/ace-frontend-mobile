import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { DeliveryNoteDetailScreen } from '@/features/delivery/screens/DeliveryNoteDetailScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { deliveryNoteDetail, me } from '@/test/fixtures';
import * as pdf from '@/native/pdf';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { id: 'dn1' } }),
}));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  jest.restoreAllMocks();
});
afterAll(() => server.close());

const meRoute = (permissions: Record<string, string>) =>
  http.get('http://localhost:8000/api/v1/auth/me', () => HttpResponse.json(me(permissions)));

test('a submitted note shows step 1 and CONTINUE = "Mark delivered", which POSTs mark-delivered', async () => {
  let markDeliveredBody: unknown;
  server.use(
    meRoute({ 'delivery_note.mark_delivered': 'own' }),
    http.get('http://localhost:8000/api/v1/delivery-notes/dn1', () =>
      HttpResponse.json(deliveryNoteDetail({ status: 'submitted' }))),
    http.post('http://localhost:8000/api/v1/delivery-notes/dn1/mark-delivered', async ({ request }) => {
      markDeliveredBody = await request.json();
      return HttpResponse.json(deliveryNoteDetail({ status: 'delivered' }));
    }),
  );

  const { findByText, getByText } = await render(
    <Providers>
      <DeliveryNoteDetailScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  expect(await findByText('SUBMITTED')).toBeTruthy();
  const continueButton = await findByText('MARK DELIVERED');
  await fireEvent.press(continueButton);

  await waitFor(() => expect(markDeliveredBody).toBeTruthy());
  expect(await findByText('DELIVERED')).toBeTruthy();
  expect(getByText('SKU-1 · M / Blue')).toBeTruthy();
  expect(getByText('8 of 40')).toBeTruthy();
});

test('a draft note without delivery_note.submit shows CONTINUE disabled with the permission hint', async () => {
  server.use(
    meRoute({}),
    http.get('http://localhost:8000/api/v1/delivery-notes/dn1', () =>
      HttpResponse.json(deliveryNoteDetail({ status: 'draft' }))),
  );

  const { findByText } = await render(
    <Providers>
      <DeliveryNoteDetailScreen />
    </Providers>,
  );

  expect(await findByText('SUBMIT')).toBeTruthy();
  expect(await findByText('Needs delivery_note.submit')).toBeTruthy();
});

test('the PDF button downloads and opens the delivery note PDF', async () => {
  server.use(
    meRoute({}),
    http.get('http://localhost:8000/api/v1/delivery-notes/dn1', () =>
      HttpResponse.json(deliveryNoteDetail({ status: 'draft' }))),
  );
  const pdfSpy = jest.spyOn(pdf, 'downloadAuthedPdf').mockResolvedValue('file:///mock/documents/ace/DN-26-27-000007.pdf');
  const openSpy = jest.spyOn(pdf, 'openPdf').mockResolvedValue(undefined);

  const { findByText, findByLabelText } = await render(
    <Providers>
      <DeliveryNoteDetailScreen />
    </Providers>,
  );

  expect(await findByText('DN-26-27-000007')).toBeTruthy();
  await fireEvent.press(await findByLabelText('Download PDF'));

  await waitFor(() => expect(pdfSpy).toHaveBeenCalledWith({ path: '/delivery-notes/dn1/pdf', fileName: 'DN-26-27-000007.pdf' }));
  expect(openSpy).toHaveBeenCalledWith('file:///mock/documents/ace/DN-26-27-000007.pdf', 'DN-26-27-000007');
});
