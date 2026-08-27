import { isAxiosError } from 'axios';

export type ErrorKind = 'http' | 'network' | 'timeout' | 'unknown';

export class ApiError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    public readonly status: number | null,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
    public readonly rowIndex: number | null = null,
    public readonly detail: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (isAxiosError(err)) {
    if (err.code === 'ECONNABORTED') return new ApiError('timeout', null, 'timeout', 'The request timed out');
    if (!err.response) return new ApiError('network', null, 'network', 'No connection');
    const status = err.response.status;
    const detail = (err.response.data as { detail?: unknown } | undefined)?.detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail) && 'code' in detail) {
      const d = detail as { code: string; message?: string; row_index?: number };
      return new ApiError('http', status, d.code, d.message ?? d.code, {}, d.row_index ?? null, detail);
    }
    if (Array.isArray(detail)) {
      const fieldErrors: Record<string, string> = {};
      for (const item of detail as { loc?: unknown[]; msg?: string }[]) {
        const field = String(item.loc?.filter((p) => p !== 'body').join('.') ?? '');
        if (item.msg && !(field in fieldErrors)) fieldErrors[field] = item.msg;
      }
      return new ApiError(
        'http',
        status,
        'validation_error',
        Object.values(fieldErrors).join('; ') || 'Invalid input',
        fieldErrors,
        null,
        detail,
      );
    }
    if (typeof detail === 'string') return new ApiError('http', status, 'error', detail, {}, null, detail);
    return new ApiError('http', status, status === 403 ? 'forbidden' : 'error', `Request failed (${status})`);
  }
  if (err instanceof Error) return new ApiError('unknown', null, 'unknown', err.message);
  return new ApiError('unknown', null, 'unknown', 'Something went wrong');
}

export function getErrorMessage(err: unknown, map?: Record<string, string>): string {
  const e = toApiError(err);
  return map?.[e.code] ?? e.message;
}

/**
 * Pulls one field out of a structured `{code, message, ...}` error body — the
 * delivery module's `exceeds_eligible` 422 carries `so_line_id` alongside its
 * `code`/`message` (see `ApiError.detail`), and a screen needs that id to
 * highlight the offending line. Returns `null` for anything that isn't that
 * shape (a plain string detail, a validation-error array, network/timeout).
 */
export function getErrorDetailField(err: unknown, field: string): string | null {
  const detail = toApiError(err).detail;
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return null;
  const value = (detail as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : null;
}
