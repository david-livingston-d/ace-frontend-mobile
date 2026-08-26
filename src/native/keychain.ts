import * as Keychain from 'react-native-keychain';

const SERVICE = 'ace.sales.refresh';

export async function getRefreshToken(): Promise<string | null> {
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  return creds ? creds.password : null;
}

export async function setRefreshToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('refresh', token, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    securityLevel: Keychain.SECURITY_LEVEL.ANY,
  });
}

export async function clearRefreshToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
