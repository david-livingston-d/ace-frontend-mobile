import React, { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, X } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { formatDate } from '@/lib/format/date';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';

export type DateFieldProps = {
  label: string;
  /** `'YYYY-MM-DD'` or null/undefined when unset. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  clearable?: boolean;
};

/** Local Y-M-D — never `Intl`/`toLocaleDateString`, which Hermes can't rely on
 * (see `src/lib/format/date.ts`). The native picker hands back a `Date` in the
 * device's local timezone, so this reads its *local* getters (unlike `date.ts`'s
 * UTC-based parsing of API strings, which is a different direction entirely). */
function toIsoDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DateField({ label, value, onChange, placeholder = 'Any date', minimumDate, maximumDate, clearable }: DateFieldProps) {
  const theme = useTheme();
  const [show, setShow] = useState(false);

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    setShow(false);
    if (event.type === 'set' && date) onChange(toIsoDate(date));
  }

  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setShow(true)}>
        <Text variant="label" color="textMuted" style={styles.label}>{label}</Text>
        <View style={[styles.row, { borderColor: theme.colors.border, borderRadius: radius.control, backgroundColor: theme.colors.surface }]}>
          <Calendar size={16} color={theme.colors.textSubtle} />
          <Text variant="body" color={value ? 'text' : 'textSubtle'} style={styles.value}>
            {value ? formatDate(value) : placeholder}
          </Text>
          {clearable && value ? (
            <IconButton icon={X} label={`Clear ${label}`} size="sm" onPress={() => onChange(null)} />
          ) : null}
        </View>
      </Pressable>
      {show ? (
        <DateTimePicker
          mode="date"
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], borderWidth: 1, paddingHorizontal: space[3], paddingVertical: space[2] },
  value: { flex: 1 },
  label: { marginBottom: space[1] },
});
