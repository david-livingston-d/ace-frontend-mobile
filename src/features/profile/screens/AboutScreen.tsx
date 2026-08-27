import React, { useState } from 'react';
import { View, Image, Linking, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DeviceInfo from 'react-native-device-info';
import { Screen, Text, Card, Button, Banner, Divider } from '@/ui';
import { toast } from '@/ui/Toast';
import { space } from '@/ui/tokens/spacing';
import { env } from '@/lib/env';
import { decide, useVersionCheck } from '@/lib/version';
import { getErrorMessage } from '@/lib/api/errors';
import type { RootStackParamList } from '@/navigation/types';
import wordmark from '../../../../assets/ace-wordmark-black.png';

type Nav = NativeStackNavigationProp<RootStackParamList, 'About'>;

const ENV_LABEL: Record<typeof env.ENV, string> = { dev: 'Development', test: 'Test', prod: 'Production' };

// Mockup G6's "About" row. `env.ENV` is shown so a tester can tell which
// backend a build was pointed at without digging into `.env` — never a
// secret, just `dev`/`test`/`prod`.
export function AboutScreen() {
  const navigation = useNavigation<Nav>();
  const { latest, downloadUrl, refetch } = useVersionCheck();
  const [checking, setChecking] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  async function handleCheckForUpdate() {
    setChecking(true);
    setShowUpdateBanner(false);
    try {
      const result = await refetch({ throwOnError: true });
      const android = result.data;
      const current = DeviceInfo.getVersion();
      // Re-derive from this call's own response rather than the hook's
      // `state` (which reflects the *previous* render's cache) — a stale
      // read here would show "Up to date" for one more render even after a
      // real update just came back.
      const nextState = android ? decide(current, android.min_supported_version, android.latest_version) : 'ok';
      if (nextState === 'ok') toast.show('Up to date');
      else setShowUpdateBanner(true);
    } catch (err) {
      toast.show(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen title="About" back={() => navigation.goBack()}>
      <View style={styles.wordmarkWrap}>
        <Image source={wordmark} resizeMode="contain" style={styles.wordmark} />
      </View>

      <Card>
        <Text variant="h4">ACE Sales</Text>
        <Text variant="bodySm" color="textMuted" style={styles.row}>
          {`Version ${DeviceInfo.getVersion()} (build ${DeviceInfo.getBuildNumber()})`}
        </Text>
        <Text variant="bodySm" color="textMuted" style={styles.row}>
          {`Environment: ${ENV_LABEL[env.ENV]}`}
        </Text>
      </Card>

      <Divider style={styles.divider} />

      <Button label="Check for update" variant="outline" loading={checking} onPress={handleCheckForUpdate} />

      {showUpdateBanner ? (
        <View style={styles.banner}>
          <Banner
            tone="info"
            title="Update available"
            body={`Version ${latest} is ready to install.`}
            action={{ label: 'Download update', onPress: () => Linking.openURL(downloadUrl) }}
          />
        </View>
      ) : null}

      <Text variant="caption" color="textSubtle" style={styles.footer}>
        Advanced Clothing Concepts
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wordmarkWrap: { alignItems: 'center', paddingVertical: space[6] },
  wordmark: { width: 140, height: 42 },
  row: { marginTop: space[2] },
  divider: { marginVertical: space[4] },
  banner: { marginTop: space[4] },
  footer: { marginTop: space[6], textAlign: 'center' },
});
