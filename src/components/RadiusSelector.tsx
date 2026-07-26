import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AppColors } from '../theme';
import { useAppTheme } from '../themeContext';

const PRESETS = [
  { label: '300 m', value: 300 },
  { label: '500 m', value: 500 },
  { label: '1 km', value: 1_000 },
];

type Props = {
  value: number;
  onChange: (radiusMeters: number) => void;
};

export function RadiusSelector({ value, onChange }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [custom, setCustom] = useState(
    PRESETS.some((preset) => preset.value === value) ? '' : String(value),
  );

  return (
    <View>
      <View style={styles.row}>
        {PRESETS.map((preset) => {
          const selected = value === preset.value;
          return (
            <Pressable
              key={preset.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => {
                setCustom('');
                onChange(preset.value);
              }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: Boolean(custom) }}
          style={[styles.chip, Boolean(custom) && styles.chipSelected]}
          onPress={() => setCustom(String(value))}
        >
          <Text
            style={[styles.chipText, Boolean(custom) && styles.chipTextSelected]}
          >
            Custom
          </Text>
        </Pressable>
      </View>

      {custom ? (
        <View style={styles.customRow}>
          <TextInput
            accessibilityLabel="Custom alarm radius in meters"
            keyboardType="number-pad"
            maxLength={5}
            style={styles.customInput}
            value={custom}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '');
              setCustom(digits);
              const parsed = Number(digits);
              if (parsed >= 100 && parsed <= 20_000) onChange(parsed);
            }}
          />
          <Text style={styles.unit}>meters (100–20,000)</Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  chipSelected: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  chipText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.black,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  customInput: {
    width: 90,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  unit: {
    color: colors.muted,
    fontSize: 13,
    marginLeft: 10,
  },
  });
}
