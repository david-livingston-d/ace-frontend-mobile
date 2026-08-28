import React, { useState } from 'react';
import { View, Image, Linking, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DeviceInfo from 'react-native-device-info';
import { Banner, Button, Screen, SettingsGroup, SettingsRow, Text, useBottomClearance, useTheme } from '@/ui';
import { toast } from '@/ui/Toast';
import { space } from '@/ui/tokens/spacing';
import { env } from '@/lib/env';
import { usePrefs } from '@/store/prefs';
import { decide, useVersionCheck } from '@/lib/version';
import { getErrorMessage } from '@/lib/api/errors';
import type { RootStackParamList } from '@/navigation/types';
import wordmark from '../../../../assets/ace-wordmark-black.png';

type Nav = NativeStackNavigationProp<RootStackParamList, 'About'>;

const ENV_LABEL: Record<typeof env.ENV, string> = { dev: 'Development', test: 'Test', prod: 'Production' };

/**
 * The `about` frame: wordmark and version centred at the top, the build's
 * facts as a settings group, one action, and a closing note. `env.ENV` is
 * shown so a tester can tell which backend a build was pointed at without
 * digging into `.env` — never a secret, just `dev`/`test`/`prod`.
 */
export function AboutScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const clearance = useBottomClearance();
  const { latest, downloadUrl, refetch } = useVersionCheck();
  const debugInsets = usePrefs((s) => s.debugInsets);
  const setDebugInsets = usePrefs((s) => s.setDebugInsets);
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
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: clearance }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.identity}>
          {/* The only wordmark asset in the repo is black — `tintColor`
              re-colours it for dark mode, exactly as `SplashScreen` and
              `LoginScreen` do, so it isn't invisible on a dark background. */}
          <Image
            source={wordmark}
            resizeMode="contain"
            style={styles.wordmark}
            tintColor={theme.mode === 'dark' ? theme.colors.textStrong : undefined}
          />
          <Text variant="label" color="muted">Sales</Text>
          <Text variant="caption" color="muted" style={styles.version}>
            {`Version ${DeviceInfo.getVersion()} (build ${DeviceInfo.getBuildNumber()})`}
          </Text>
        </View>

        <SettingsGroup>
          <SettingsRow title="Environment" right={<Text variant="rowStrong">{ENV_LABEL[env.ENV]}</Text>} />
          <SettingsRow title="API" right={<Text variant="rowStrong">{env.API_URL}</Text>} />
        </SettingsGroup>

        <Button label="Check for update" variant="outline" fullWidth loading={checking} onPress={handleCheckForUpdate} />

        {showUpdateBanner ? (
          <Banner
            tone="info"
            title="Update available"
            body={`Version ${latest} is ready to install.`}
            action={{ label: 'Download update', onPress: () => Linking.openURL(downloadUrl) }}
          />
        ) : null}

        {/* Development builds only — the safe-area read-out this screen toggles
            (`InsetDebugOverlay`) is scaffolding for the M4 redesign, never
            something a release build offers. */}
        {__DEV__ ? (
          <Button
            label={debugInsets ? 'Hide inset overlay' : 'Show inset overlay'}
            variant="ghost"
            onPress={() => setDebugInsets(!debugInsets)}
          />
        ) : null}

        <Text variant="caption" color="subtle" align="center" style={styles.footer}>
          ACE Order Management & Inventory — Sales app.{'\n'}© 2026 Advanced Clothing Concepts.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: space[4] },
  identity: { alignItems: 'center', gap: space[2], paddingTop: space[6] },
  wordmark: { width: 140, height: 42 },
  version: { marginTop: space[1] },
  footer: { marginTop: space[4] },
});
