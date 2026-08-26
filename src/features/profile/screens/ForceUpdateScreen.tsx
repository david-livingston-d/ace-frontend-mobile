import React from 'react';
import { View, Image, Linking, StyleSheet } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useTheme, Text, Button } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { useVersionCheck } from '@/lib/version';
import wordmark from '../../../../assets/ace-wordmark-black.png';

// Rendered by `RootNavigator` in place of the entire stack (including Login)
// whenever `useVersionCheck().state === 'force'` — the installed build is
// below the backend's `min_supported_version` and must not be usable at all.
export function ForceUpdateScreen() {
  const theme = useTheme();
  const { latest, downloadUrl } = useVersionCheck();
  const current = DeviceInfo.getVersion();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <Image
        source={wordmark}
        resizeMode="contain"
        style={styles.wordmark}
        tintColor={theme.mode === 'dark' ? theme.colors.textStrong : undefined}
      />
      <Text variant="h3" style={styles.title}>Update required</Text>
      <Text variant="bodySm" color="textMuted" align="center" style={styles.body}>
        {`You're on v${current} · the latest version is v${latest}. Update to keep using ACE Sales.`}
      </Text>
      <View style={styles.action}>
        <Button label="Download update" onPress={() => Linking.openURL(downloadUrl)} disabled={!downloadUrl} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[6] },
  wordmark: { width: 160, height: 48, marginBottom: space[6] },
  title: { marginBottom: space[2] },
  body: { marginBottom: space[6] },
  action: { alignSelf: 'stretch' },
});
