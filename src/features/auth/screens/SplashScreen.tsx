import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useTheme, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import wordmark from '../../../../assets/ace-wordmark-black.png';

// Shown while `useSession().boot()` resolves (mockup A0). There's only a black
// wordmark asset in the repo — `tintColor` re-colours it for dark mode instead
// of needing a separate white PNG.
export function SplashScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <Image
        source={wordmark}
        resizeMode="contain"
        style={styles.wordmark}
        tintColor={theme.mode === 'dark' ? theme.colors.textStrong : undefined}
      />
      <Text variant="caption" color="textSubtle" style={styles.version}>
        {`v${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: { width: 160, height: 48 },
  version: { position: 'absolute', bottom: space[8] },
});
