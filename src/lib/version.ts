import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import DeviceInfo from 'react-native-device-info';
import { env } from '@/lib/env';
import { keys } from '@/lib/query/keys';

/** Compares two `x.y.z` semver strings. Missing/non-numeric segments count as 0. */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  // A non-numeric segment (e.g. the `0-rc1` in `1.2.0-rc1`) makes `Number(...)`
  // produce `NaN`, and `NaN - anything` is always `NaN` — never `< 0`, so the
  // loop would fall through treating that segment as equal without actually
  // comparing it. Per the docstring, missing/non-numeric segments count as 0.
  const seg = (p: number[], i: number) => (Number.isFinite(p[i]) ? (p[i] as number) : 0);
  for (let i = 0; i < 3; i++) {
    const d = seg(pa, i) - seg(pb, i);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export type VersionState = 'ok' | 'update' | 'force';

/** Below the min supported version => hard-blocked; below latest => a soft nudge; else current. */
export function decide(current: string, min: string, latest: string): VersionState {
  if (compareSemver(current, min) < 0) return 'force';
  if (compareSemver(current, latest) < 0) return 'update';
  return 'ok';
}

/** Whether `UpdateBanner` should render: only for a soft update the user hasn't already dismissed for this exact latest version. */
export function shouldShowBanner(state: VersionState, latest: string, dismissedVersion: string | null): boolean {
  return state === 'update' && dismissedVersion !== latest;
}

type VersionOut = { android: { latest_version: string; min_supported_version: string; download_url: string } };

// Bare axios.get, deliberately not routed through `api` — no auth header, no
// token-refresh interceptor, no api_call analytics event: this is an
// unauthenticated, pre-login-capable check, not a normal API call.
export function useVersionCheck() {
  const q = useQuery({
    queryKey: keys.version,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    queryFn: () => axios.get<VersionOut>(`${env.API_URL}/api/v1/app/version`, { timeout: 8000 }).then((r) => r.data.android),
  });
  const current = DeviceInfo.getVersion();
  const a = q.data;
  return {
    state: a ? decide(current, a.min_supported_version, a.latest_version) : 'ok',
    latest: a?.latest_version ?? current,
    downloadUrl: a?.download_url ?? '',
    // Exposed for `AboutScreen`'s "Check for update" button — a manual,
    // user-initiated recheck rather than waiting on `refetchOnWindowFocus`.
    refetch: q.refetch,
    isFetching: q.isFetching,
  } as const;
}
