import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { ClipboardList, Info, ShieldCheck } from 'lucide-react-native';
import {
  Avatar,
  Button,
  Card,
  Screen,
  SegmentedControl,
  SettingsGroup,
  SettingsRow,
  Sheet,
  StatusChip,
  Text,
  useBottomClearance,
  useSheet,
} from '@/ui';
import { gapChips, space } from '@/ui/tokens/spacing';
import { CONTROL } from '@/ui/tokens/layout';
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

/** The `more` frame: an identity card, the theme control, one settings group,
 * and a full-width outline Log out in the danger tone. */
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
  const clearance = useBottomClearance();

  async function handleLogOut() {
    confirm.close();
    await signOut();
  }

  return (
    <Screen title="More">
      {/* Scrollable rather than a fixed column: at the largest system font
          size the profile card, theme control, rows and Log out are taller
          than a phone screen, and Log out was simply unreachable. */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: clearance }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <View style={styles.identity}>
            <Avatar name={me?.name ?? '?'} size={CONTROL.avatarLg} />
            <View style={styles.identityText}>
              <Text variant="cardTitle" numberOfLines={1}>{me?.name ?? '—'}</Text>
              <Text variant="caption" color="muted" numberOfLines={1}>{me?.email ?? ''}</Text>
              <View style={styles.chips}>
                {me?.is_superadmin ? <StatusChip tone="info" label="Superadmin" size="sm" /> : null}
                {me?.roles.map((role) => <StatusChip key={role} tone="neutral" label={role} size="sm" />)}
              </View>
            </View>
          </View>
          {departmentName ? (
            <Text variant="caption" color="subtle" style={styles.department}>
              Department: {departmentName}
            </Text>
          ) : null}
        </Card>

        <View style={styles.group}>
          <Text variant="label" color="muted">Theme</Text>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={theme}
            onChange={(value) => setTheme(value as ThemePref)}
          />
        </View>

        <SettingsGroup>
          {/* There is no mobile audit-log/activity API (the timeline endpoint
              is per-order, not per-user) — this simply hands the rep off to
              their own Orders list rather than inventing a screen for data the
              backend doesn't expose yet. */}
          <SettingsRow
            icon={ClipboardList}
            title="My activity"
            subtitle="Orders you've worked on"
            chevron
            onPress={() => navigation.navigate('Orders', { preset: undefined })}
          />
          <SettingsRow icon={Info} title="About" chevron onPress={() => navigation.navigate('About')} />
          <SettingsRow icon={ShieldCheck} title="Privacy & terms" chevron onPress={() => navigation.navigate('Privacy')} />
        </SettingsGroup>

        <Button variant="outline" label="Log out" destructive fullWidth onPress={confirm.open} />
      </ScrollView>

      <Sheet ref={confirm.ref} snapPoints={['30%']} title="Log out?">
        <Text variant="body" color="muted" style={styles.confirmBody}>
          You will need to sign in again to continue.
        </Text>
        <Button variant="solid" label="Log out" destructive fullWidth onPress={handleLogOut} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: space[4], paddingTop: space[1] },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[4] - 2 },
  identityText: { flex: 1, gap: space[1] - 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: gapChips - 2, marginTop: space[1] },
  department: { marginTop: space[3] },
  group: { gap: space[2] },
  confirmBody: { marginBottom: space[4] },
});
