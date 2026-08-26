import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
// msw/node, not msw/native — see src/lib/api/__tests__/tokens.test.ts.
import { setupServer } from 'msw/node';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { Providers } from '@/providers';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// @testing-library/react-native v14's render/fireEvent are async (built on the new
// test-renderer package) — adapted with await; assertions are unchanged from the brief.
async function submit(email = 'k@ace.in', password = 'pw') {
  const utils = await render(
    <Providers>
      <LoginScreen />
    </Providers>,
  );
  await fireEvent.changeText(utils.getByLabelText('Email'), email);
  await fireEvent.changeText(utils.getByLabelText('Password'), password);
  await fireEvent.press(utils.getByText('SIGN IN'));
  return utils;
}

test('wrong password shows the inline error', async () => {
  server.use(
    http.post('http://localhost:8000/api/v1/auth/login', () =>
      HttpResponse.json({ detail: { code: 'invalid_credentials', message: 'x' } }, { status: 401 }),
    ),
  );
  const { findByText } = await submit();
  expect(await findByText('Invalid credentials — check password')).toBeTruthy();
});

test('lockout shows the retry-after minutes', async () => {
  server.use(
    http.post('http://localhost:8000/api/v1/auth/login', () =>
      HttpResponse.json({ detail: { code: 'too_many_attempts', message: 'x' } }, { status: 429, headers: { 'Retry-After': '900' } }),
    ),
  );
  const { findByText } = await submit();
  expect(await findByText('Too many attempts — try again in 15 min')).toBeTruthy();
});

test('no connection shows the full-screen retry state', async () => {
  server.use(http.post('http://localhost:8000/api/v1/auth/login', () => HttpResponse.error()));
  const { findByText } = await submit();
  expect(await findByText('No connection')).toBeTruthy();
  expect(await findByText('RETRY')).toBeTruthy();
});

test('empty fields are validated before any request', async () => {
  const { findByText } = await submit('', '');
  expect(await findByText('Enter your email')).toBeTruthy();
});
