import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, Text, useBottomClearance } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Privacy'>;

// Mockup G7. Placeholder legal copy only — not reviewed by counsel; swap in
// the real policy text before this build goes anywhere beyond internal
// testers. Section numbering (1-5) matches the mockup.
export function PrivacyScreen() {
  const navigation = useNavigation<Nav>();
  const clearance = useBottomClearance();

  return (
    <Screen title="Privacy & terms" back={() => navigation.goBack()}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: clearance }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="caption" color="textSubtle">
          Last updated 27 Aug 2026 · Advanced Clothing Concepts · privacy@ace.in
        </Text>
        <Text variant="bodySm" color="textMuted" style={styles.notice}>
          Placeholder text — not final legal copy.
        </Text>

        <Text variant="h4" style={styles.heading}>1. What we collect</Text>
        <Text variant="body" color="textMuted">
          Placeholder: account details (name, email, role), order and customer records you create
          or view in this app, and basic device/app diagnostics.
        </Text>

        <Text variant="h4" style={styles.heading}>2. How we use it</Text>
        <Text variant="body" color="textMuted">
          Placeholder: to run the order, delivery and payment workflows this app exists for, and
          to keep the service reliable and secure.
        </Text>

        <Text variant="h4" style={styles.heading}>3. Sharing</Text>
        <Text variant="body" color="textMuted">
          Placeholder: data stays within Advanced Clothing Concepts and its service providers
          (hosting, analytics); it is not sold to third parties.
        </Text>

        <Text variant="h4" style={styles.heading}>4. Your rights</Text>
        <Text variant="body" color="textMuted">
          Placeholder: contact privacy@ace.in to ask what is held about you or to request a
          correction.
        </Text>

        <Text variant="h4" style={styles.heading}>5. Terms of use</Text>
        <Text variant="body" color="textMuted">
          Placeholder: this app is for use by Advanced Clothing Concepts staff in the course of
          their work; misuse of customer or order data is a disciplinary matter.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { marginTop: space[1], marginBottom: space[2] },
  heading: { marginTop: space[5], marginBottom: space[2] },
});
