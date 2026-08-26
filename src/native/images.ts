import { env } from '@/lib/env';
import { getAccessToken } from '@/lib/api/tokens';

/**
 * `GET /api/v1/files/{key}` is an authenticated endpoint (product/variant
 * images live in the same private storage as PDFs) — RN's `Image` supports a
 * `headers` object on its `source`, so the bearer just rides along with the
 * image request instead of needing a signed URL or a proxy.
 *
 * The token is read live (not memoized) so a picker sheet opened long after
 * login still gets whatever the current access token is, matching how `api`
 * client itself reads it fresh per request.
 */
export function authedImageSource(key: string): { uri: string; headers: { Authorization: string } } {
  return {
    uri: `${env.API_URL}/api/v1/files/${key}`,
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
  };
}
