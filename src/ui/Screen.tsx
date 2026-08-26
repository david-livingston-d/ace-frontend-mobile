import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { space } from './tokens/spacing';

export type ScreenProps = {
  title?: string;
  back?: () => void;
  children?: React.ReactNode;
};

export function Screen({ title, back, children }: ScreenProps) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {title || back ? (
        <View style={styles.header}>
          {back ? <IconButton icon={ChevronLeft} label="Back" onPress={back} /> : null}
          {title ? <Text variant="h3" style={styles.title}>{title}</Text> : null}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], paddingVertical: space[3] },
  title: { marginLeft: space[2] },
  body: { flex: 1, paddingHorizontal: space[4] },
});
