import React from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { Download } from 'lucide-react-native';
import DeviceInfo from 'react-native-device-info';
import { Button, HeroScreen, IconDisc, Screen, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { PROSE } from '@/ui/tokens/layout';
import { heroPalette } from '@/ui/tokens/colors';
import { useVersionCheck } from '@/lib/version';

/**
 * The `force-update` frame: a hard gate with no dismiss, on the same glossy
 * surface as login. Rendered by `RootNavigator` in place of the entire stack
 * (including Login) whenever `useVersionCheck().state === 'force'` — the
 * installed build is below the backend's `min_supported_version` and must not
 * be usable at all.
 */
export function ForceUpdateScreen() {
  const { latest, downloadUrl } = useVersionCheck();
  const current = DeviceInfo.getVersion();

  return (
    <HeroScreen>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.centre}>
          <IconDisc icon={Download} color={heroPalette.muted} />
          <Text variant="screenTitle" align="center">Update required</Text>
          <Text variant="prose" color="muted" align="center" style={styles.body}>
            This version of ACE Sales is no longer supported. Download the latest build to carry on.
          </Text>
          <View style={styles.action}>
            <Button
              label="Download update"
              size="lg"
              fullWidth
              onPress={() => Linking.openURL(downloadUrl)}
              disabled={!downloadUrl}
            />
          </View>
          <Text variant="caption" color="muted" align="center">
            {`Installed v${current} · required v${latest}`}
          </Text>
        </View>
      </Screen>
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4] },
  body: { maxWidth: PROSE.hero },
  action: { alignSelf: 'stretch', marginTop: space[1] },
});
