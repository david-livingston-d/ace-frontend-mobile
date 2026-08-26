import React, { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';

export type ExpanderProps = {
  title: string;
  children?: React.ReactNode;
};

export function Expander({ title, children }: ExpanderProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.header}
      >
        <Text variant="h4">{title}</Text>
        {open ? (
          <ChevronDown size={18} color={theme.colors.textSubtle} />
        ) : (
          <ChevronRight size={18} color={theme.colors.textSubtle} />
        )}
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[3] },
  body: { paddingBottom: space[3] },
});
