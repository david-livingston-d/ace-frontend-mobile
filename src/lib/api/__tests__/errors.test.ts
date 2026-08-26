import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorMessage, toApiError } from '@/lib/api/errors';

const axiosErr = (status: number, data: unknown) => new AxiosError('x', 'ERR', { headers: new AxiosHeaders() }, null, { status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } });

test('normalises the {code,message} envelope with row_index', () => {
  const e = toApiError(axiosErr(422, { detail: { code: 'insufficient_available', message: 'Only 8 left', row_index: 2 } }));
  expect(e).toMatchObject({ status: 422, code: 'insufficient_available', message: 'Only 8 left', rowIndex: 2, kind: 'http' });
});

test('normalises the pydantic list shape into fieldErrors', () => {
  const e = toApiError(axiosErr(422, { detail: [{ loc: ['body', 'amount'], msg: 'Input should be greater than 0', type: 'greater_than' }] }));
  expect(e.code).toBe('validation_error');
  expect(e.fieldErrors).toEqual({ amount: 'Input should be greater than 0' });
  expect(e.message).toBe('Input should be greater than 0');
});

test('network and timeout errors are distinguishable', () => {
  expect(toApiError(new AxiosError('Network Error', 'ERR_NETWORK')).kind).toBe('network');
  expect(toApiError(new AxiosError('timeout', 'ECONNABORTED')).kind).toBe('timeout');
});

test('feature maps win over the server message; unknown codes fall back', () => {
  const err = axiosErr(403, { detail: { code: 'rate_override_required', message: 'server text' } });
  expect(getErrorMessage(err, { rate_override_required: 'You cannot change the rate' })).toBe('You cannot change the rate');
  expect(getErrorMessage(err)).toBe('server text');
  expect(getErrorMessage(new Error('boom'))).toBe('boom');
});
