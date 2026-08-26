import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text, StatusChip, Chip, Button, Sheet, useSheet, Divider } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { useMe } from '@/features/auth/hooks';
import { useSession } from '@/store/session';
import { usePrefs, type ThemePref } from '@/store/prefs';

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Minimal for M1 (per task-4-brief.md step 5) — About/Privacy land in M3-T4.
export function MoreScreen() {
  const { data: me } = useMe();
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const signOut = useSession((s) => s.signOut);
  const confirm = useSheet();

  async function handleLogOut() {
    confirm.close();
    await signOut();
  }

  return (
    <Screen title="More">
      <View style={styles.section}>
        <Text variant="h4">{me?.name ?? '—'}</Text>
        <Text variant="bodySm" color="textMuted">{me?.email ?? ''}</Text>
        <View style={styles.chips}>
          {me?.is_superadmin ? <StatusChip tone="info" label="Superadmin" size="sm" /> : null}
          {me?.roles.map((role) => <StatusChip key={role} tone="neutral" label={role} size="sm" />)}
        </View>
        {me?.department_id ? (
          <Text variant="caption" color="textSubtle" style={styles.department}>
            Department: {me.department_id}
          </Text>
        ) : null}
      </View>

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <Text variant="label" color="textMuted">Theme</Text>
        <View style={styles.chips}>
          {THEME_OPTIONS.map((opt) => (
            <Chip key={opt.value} label={opt.label} selected={theme === opt.value} onPress={() => setTheme(opt.value)} />
          ))}
        </View>
      </View>

      <Divider style={styles.divider} />

      <Button variant="outline" label="Log out" onPress={confirm.open} />

      <Sheet ref={confirm.ref} snapPoints={['30%']} title="Log out?">
        <Text variant="body" color="textMuted" style={styles.confirmBody}>
          You will need to sign in again to continue.
        </Text>
        <Button variant="solid" label="Log out" fullWidth onPress={handleLogOut} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
  department: { marginTop: space[2] },
  divider: { marginVertical: space[2] },
  confirmBody: { marginBottom: space[4] },
});
