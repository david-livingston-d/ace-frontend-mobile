import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Screen, Text, StatusChip, Chip, ListRow, Button, Sheet, useSheet, Divider } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { useMe } from '@/features/auth/hooks';
import { useDepartments } from '@/features/masters/hooks';
import { useSession } from '@/store/session';
import { usePrefs, type ThemePref } from '@/store/prefs';
import type { RootStackParamList, TabParamList } from '@/navigation/types';

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type Nav = NavigationProp<TabParamList & Pick<RootStackParamList, 'About' | 'Privacy'>>;

// Mockup G6. Profile card + settings + static-content rows + log out.
export function MoreScreen() {
  const navigation = useNavigation<Nav>();
  const { data: me } = useMe();
  // Gated on `departments.read` inside the hook itself — a user without it
  // never sends the request, and `departmentName` below stays `undefined`,
  // which omits the row entirely. The department master only has an id+name,
  // so a raw `department_id` (a UUID) must never be the fallback display.
  const { data: departments } = useDepartments();
  const departmentName = departments?.find((d) => d.id === me?.department_id)?.name;
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
        {departmentName ? (
          <Text variant="caption" color="textSubtle" style={styles.department}>
            Department: {departmentName}
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

      <View>
        {/* There is no mobile audit-log/activity API (the timeline endpoint
            is per-order, not per-user) — this simply hands the rep off to
            their own Orders list rather than inventing a screen for data the
            backend doesn't expose yet. */}
        <ListRow title="My activity" subtitle="Orders you've worked on" chevron onPress={() => navigation.navigate('Orders', { preset: undefined })} />
        <ListRow title="About" chevron onPress={() => navigation.navigate('About')} />
        <ListRow title="Privacy & terms" chevron onPress={() => navigation.navigate('Privacy')} />
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
