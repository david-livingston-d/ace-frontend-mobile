import React, { useState } from 'react';
import { Modal, Platform, Pressable, View, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, X } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Button } from './Button';
import { Divider } from './Divider';
import { IconButton } from './IconButton';
import { formatDate } from '@/lib/format/date';
import { n as neutrals } from './tokens/colors';
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

function valueAsDate(value: string | null | undefined): Date {
  return value ? new Date(`${value}T00:00:00`) : new Date();
}

export function DateField({ label, value, onChange, placeholder = 'Any date', minimumDate, maximumDate, clearable }: DateFieldProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Read per render rather than hoisted to a module constant: `Platform.OS` is
  // fixed on a device, but a module constant is captured at import time, which
  // makes the two branches below untestable in one Jest run.
  const isIos = Platform.OS === 'ios';
  // Android: the picker is a self-presenting modal dialog, so it is mounted
  // only while `show` is true and it reports the user's choice once, on OK.
  // iOS: `DateTimePicker` has no dialog — it renders *inline*, pushing whatever
  // is below it down the screen — so `show` instead drives the bottom panel
  // below, and the spinner's value is held as a draft until Done.
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState<Date | null>(null);

  function open() {
    if (isIos) setDraft(valueAsDate(value));
    setShow(true);
  }

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    if (isIos) {
      // An iOS spinner reports every intermediate scroll position as a 'set'
      // event, so nothing is committed here — only Done commits.
      if (date) setDraft(date);
      return;
    }
    setShow(false);
    if (event.type === 'set' && date) onChange(toIsoDate(date));
  }

  function confirm() {
    if (draft) onChange(toIsoDate(draft));
    setShow(false);
  }

  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={open}>
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
      {isIos ? (
        // Deliberately a plain RN `Modal` and not the app's `Sheet`: two of the
        // five `DateField` call sites (the orders and payments filter sheets)
        // already sit inside a `@gorhom/bottom-sheet` modal, and presenting a
        // second bottom-sheet modal from inside the first dismissed *both*
        // sheets on the simulator, losing the filters with it. A `Modal`
        // presents over a bottom sheet correctly and adds no dependency; the
        // panel below reproduces the `Sheet` look (surface, title, divider,
        // pinned action) with the same tokens.
        <Modal
          visible={show}
          transparent
          animationType="slide"
          supportedOrientations={['portrait']}
          onRequestClose={() => setShow(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Close ${label}`}
              style={[StyleSheet.absoluteFill, styles.backdrop]}
              onPress={() => setShow(false)}
            />
            <View
              testID="date-picker-panel"
              style={[
                styles.panel,
                { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + space[4] },
              ]}
            >
              <Text variant="h4">{label}</Text>
              <Divider style={styles.divider} />
              <DateTimePicker
                mode="date"
                display="spinner"
                value={draft ?? valueAsDate(value)}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handleChange}
              />
              <Button label="Done" onPress={confirm} fullWidth />
            </View>
          </View>
        </Modal>
      ) : null}
      {!isIos && show ? (
        <DateTimePicker
          mode="date"
          display="default"
          value={valueAsDate(value)}
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
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  // The scrim is the palette's darkest neutral in both themes, matching
  // `@gorhom/bottom-sheet`'s own backdrop — a theme-flipped (white) scrim would
  // read as a flash, not as dimming.
  backdrop: { backgroundColor: neutrals[950], opacity: 0.5 },
  panel: { paddingHorizontal: space[4], paddingTop: space[4] },
  divider: { marginVertical: space[3] },
});
