import React from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { Banner, IconButton } from '@/ui';
import { useVersionCheck, shouldShowBanner } from '@/lib/version';
import { usePrefs } from '@/store/prefs';

/**
 * A soft nudge for a non-mandatory update — unlike `ForceUpdateScreen`, the
 * app stays fully usable. Mounted at the top of `HomeScreen` (Task 6); not
 * mounted here since Home is still a placeholder in this task.
 */
export function UpdateBanner() {
  const { state, latest, downloadUrl } = useVersionCheck();
  const dismissedVersion = usePrefs((s) => s.dismissedVersion);
  const dismissVersion = usePrefs((s) => s.dismissVersion);

  if (!shouldShowBanner(state, latest, dismissedVersion)) return null;

  return (
    <View style={styles.wrap}>
      <Banner
        tone="info"
        title="Update available"
        body={`Version ${latest} is ready to install.`}
        action={{ label: 'Update', onPress: () => Linking.openURL(downloadUrl) }}
      />
      <View style={styles.dismiss}>
        <IconButton icon={X} label="Dismiss" size="sm" onPress={() => dismissVersion(latest)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  dismiss: { position: 'absolute', top: 4, right: 4 },
});
