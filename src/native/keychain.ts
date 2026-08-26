import * as Keychain from 'react-native-keychain';

const SERVICE = 'ace.sales.refresh';

// `react-native-keychain` can throw outright rather than reject cleanly — e.g.
// Android's `CryptoFailedException` after a lockscreen credential change
// invalidates the Keystore key backing the entry. Treat that the same as "no
// stored token"/"best-effort write" rather than letting it propagate: a boot
// or sign-out that can't be completed must still resolve, not hang the caller.
export async function getRefreshToken(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  try {
    await Keychain.setGenericPassword('refresh', token, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      securityLevel: Keychain.SECURITY_LEVEL.ANY,
    });
  } catch {
    // Best-effort: a failed write leaves the caller signed in for this session
    // only (nothing persisted to resume from), which is safer than throwing
    // out of `signIn`/`refreshSingleFlight` over a device-local Keystore fault.
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // Best-effort: sign-out/clear must never fail to complete over a Keystore
    // fault — worst case a stale entry lingers until the next successful write.
  }
}
