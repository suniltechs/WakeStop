import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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

const MIN_RADIUS_METERS = 100;
const MAX_RADIUS_METERS = 20_000;

type DistanceUnit = 'm' | 'km' | 'mi';

const UNIT_OPTIONS: Array<{
  value: DistanceUnit;
  label: string;
  multiplier: number;
}> = [
  { value: 'm', label: 'Meters (m)', multiplier: 1 },
  { value: 'km', label: 'Kilometers (km)', multiplier: 1_000 },
  { value: 'mi', label: 'Miles (mi)', multiplier: 1_609.344 },
];

type Props = {
  value: number;
  onChange: (radiusMeters: number) => void;
};

function getInitialCustomValue(value: number): {
  amount: string;
  unit: DistanceUnit;
} {
  if (value >= 1_000) {
    return {
      amount: String(Number((value / 1_000).toFixed(3))),
      unit: 'km',
    };
  }

  return { amount: String(value), unit: 'm' };
}

export function RadiusSelector({ value, onChange }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<DistanceUnit>('m');
  const [unitMenuVisible, setUnitMenuVisible] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const customSelected = !PRESETS.some((preset) => preset.value === value);
  const selectedUnit = UNIT_OPTIONS.find((option) => option.value === unit)!;

  const closeModal = () => {
    setModalVisible(false);
    setUnitMenuVisible(false);
    setValidationError(null);
  };

  const openCustomModal = () => {
    const initialValue = getInitialCustomValue(value);
    setAmount(initialValue.amount);
    setUnit(initialValue.unit);
    setUnitMenuVisible(false);
    setValidationError(null);
    setModalVisible(true);
  };

  const updateAmount = (text: string) => {
    const normalized = text.replace(',', '.').replace(/[^0-9.]/g, '');
    const [whole = '', ...decimalParts] = normalized.split('.');
    const sanitized = decimalParts.length
      ? `${whole}.${decimalParts.join('')}`
      : whole;
    setAmount(sanitized);
    setValidationError(null);
  };

  const applyCustomRadius = () => {
    const parsedAmount = Number(amount);
    const radiusMeters = parsedAmount * selectedUnit.multiplier;

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Enter a valid distance greater than zero.');
      return;
    }

    if (
      radiusMeters < MIN_RADIUS_METERS ||
      radiusMeters > MAX_RADIUS_METERS
    ) {
      setValidationError('Choose a distance between 100 m and 20 km.');
      return;
    }

    onChange(Math.round(radiusMeters));
    closeModal();
  };

  return (
    <View>
      <View style={styles.row} accessibilityRole="radiogroup">
        {PRESETS.map((preset) => {
          const selected = value === preset.value;
          return (
            <Pressable
              key={preset.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(preset.value)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel="Set a custom alarm distance"
          accessibilityRole="radio"
          accessibilityState={{ checked: customSelected }}
          style={[
            styles.chip,
            (customSelected || modalVisible) && styles.chipSelected,
          ]}
          onPress={openCustomModal}
        >
          <Text
            style={[
              styles.chipText,
              (customSelected || modalVisible) && styles.chipTextSelected,
            ]}
          >
            Custom
          </Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeModal}
        statusBarTranslucent
        transparent
        visible={modalVisible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            accessibilityLabel="Close custom distance dialog"
            style={styles.modalBackdrop}
            onPress={closeModal}
          />

          <View
            accessibilityViewIsModal
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleCopy}>
                <Text style={styles.modalEyebrow}>HOW EARLY?</Text>
                <Text style={styles.modalTitle}>Custom alarm distance</Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
                onPress={closeModal}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.modalDescription}>
              Enter how far from your stop WakeStop should trigger the alarm.
            </Text>

            <View style={styles.fieldRow}>
              <View style={styles.amountField}>
                <Text style={styles.fieldLabel}>Distance</Text>
                <TextInput
                  accessibilityLabel="Custom alarm distance"
                  autoFocus
                  keyboardType="decimal-pad"
                  maxLength={8}
                  placeholder="4"
                  placeholderTextColor={colors.muted}
                  selectTextOnFocus
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={updateAmount}
                  onSubmitEditing={applyCustomRadius}
                />
              </View>

              <View style={styles.unitField}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <Pressable
                  accessibilityLabel={`Distance unit, ${selectedUnit.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: unitMenuVisible }}
                  style={({ pressed }) => [
                    styles.unitSelector,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setUnitMenuVisible((visible) => !visible)}
                >
                  <Text style={styles.unitSelectorText}>{unit}</Text>
                  <Text style={styles.unitSelectorArrow}>
                    {unitMenuVisible ? '▲' : '▼'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {unitMenuVisible ? (
              <View style={styles.unitMenu}>
                {UNIT_OPTIONS.map((option) => {
                  const selected = option.value === unit;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={({ pressed }) => [
                        styles.unitOption,
                        selected && styles.unitOptionSelected,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        setUnit(option.value);
                        setUnitMenuVisible(false);
                        setValidationError(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.unitOptionText,
                          selected && styles.unitOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.rangeHint}>Allowed range: 100 m – 20 km</Text>
            {validationError ? (
              <Text accessibilityRole="alert" style={styles.validationError}>
                {validationError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.applyButton,
                  pressed && styles.pressed,
                ]}
                onPress={applyCustomRadius}
              >
                <Text style={styles.applyButtonText}>Apply distance</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.58)',
    },
    modalCard: {
      width: '100%',
      maxWidth: 440,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 20,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.24,
      shadowRadius: 24,
      elevation: 12,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    modalTitleCopy: {
      flex: 1,
      paddingRight: 12,
    },
    modalEyebrow: {
      color: colors.orangeDark,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    modalTitle: {
      color: colors.ink,
      fontSize: 22,
      fontWeight: '900',
      marginTop: 4,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.gray,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      color: colors.ink,
      fontSize: 24,
      lineHeight: 27,
      fontWeight: '500',
    },
    modalDescription: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
    },
    fieldRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },
    amountField: {
      flex: 1,
    },
    unitField: {
      width: 122,
    },
    fieldLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 7,
    },
    amountInput: {
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.ink,
      paddingHorizontal: 14,
      fontSize: 18,
      fontWeight: '800',
    },
    unitSelector: {
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
    },
    unitSelectorText: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: '800',
    },
    unitSelectorArrow: {
      color: colors.muted,
      fontSize: 11,
    },
    unitMenu: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      marginTop: 8,
      overflow: 'hidden',
    },
    unitOption: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
    },
    unitOptionSelected: {
      backgroundColor: colors.orangeSoft,
    },
    unitOptionText: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '700',
    },
    unitOptionTextSelected: {
      color: colors.orangeDark,
      fontWeight: '900',
    },
    checkmark: {
      color: colors.orangeDark,
      fontSize: 16,
      fontWeight: '900',
    },
    rangeHint: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 10,
    },
    validationError: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 17,
      marginTop: 8,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 22,
    },
    cancelButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '800',
    },
    applyButton: {
      flex: 1.35,
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: colors.orange,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    applyButtonText: {
      color: colors.black,
      fontSize: 14,
      fontWeight: '900',
    },
    pressed: {
      opacity: 0.76,
    },
  });
}
