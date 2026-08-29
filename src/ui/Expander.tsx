import React, { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { hit } from './tokens/layout';

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
        // The drawn header is the title's own line height plus `space[3]` top
        // and bottom (~42) — the kit's rule is that the *touch* box reaches 44
        // without the drawn one growing.
        hitSlop={hit.link}
        style={styles.header}
      >
        <Text variant="rowTitle">{title}</Text>
        {open ? (
          <ChevronDown size={18} color={theme.colors.subtle} />
        ) : (
          <ChevronRight size={18} color={theme.colors.subtle} />
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
