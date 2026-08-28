import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, Text, useBottomClearance } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Privacy'>;

/**
 * The `privacy` frame: numbered sections, each an uppercase `label` heading
 * over muted body copy — the body text is never uppercased, because uppercase
 * is a role (label/badge/button/chip/tab) and prose is none of them.
 *
 * Placeholder legal copy only — not reviewed by counsel; swap in the real
 * policy text before this build goes anywhere beyond internal testers.
 */
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: '1. What we collect',
    body:
      'Placeholder: account details (name, email, role), order and customer records you create ' +
      'or view in this app, and basic device/app diagnostics.',
  },
  {
    heading: '2. How we use it',
    body:
      'Placeholder: to run the order, delivery and payment workflows this app exists for, and ' +
      'to keep the service reliable and secure.',
  },
  {
    heading: '3. Sharing',
    body:
      'Placeholder: data stays within Advanced Clothing Concepts and its service providers ' +
      '(hosting, analytics); it is not sold to third parties.',
  },
  {
    heading: '4. Your rights',
    body: 'Placeholder: contact privacy@ace.in to ask what is held about you or to request a correction.',
  },
  {
    heading: '5. Terms of use',
    body:
      'Placeholder: this app is for use by Advanced Clothing Concepts staff in the course of ' +
      'their work; misuse of customer or order data is a disciplinary matter.',
  },
];

export function PrivacyScreen() {
  const navigation = useNavigation<Nav>();
  const clearance = useBottomClearance();

  return (
    <Screen title="Privacy & terms" back={() => navigation.goBack()}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: clearance }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="caption" color="subtle">
          Last updated 27 Aug 2026 · Advanced Clothing Concepts · privacy@ace.in
        </Text>
        <Text variant="caption" color="muted">Placeholder text — not final legal copy.</Text>

        {SECTIONS.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text variant="label" color="muted">{section.heading}</Text>
            <Text variant="row" color="muted" style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: space[3], paddingTop: space[1] },
  section: { gap: space[2] },
  // The mockup's 1.65 line height on body copy — a wall of legal text needs
  // the air more than any other screen does.
  body: { lineHeight: 20 },
});
