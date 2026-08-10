import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';

import type { AppColors } from '../theme';
import {
  type ThemeMode,
  useAppTheme,
} from '../themeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenReliability: () => void;
};

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  icon: MaterialIconsIconName;
  title: string;
  description: string;
}> = [
  {
    mode: 'system',
    icon: 'brightness-auto',
    title: 'System default',
    description: 'Follow your phone’s appearance setting automatically.',
  },
  {
    mode: 'light',
    icon: 'light-mode',
    title: 'Light mode',
    description: 'Use the bright white WakeStop interface.',
  },
  {
    mode: 'dark',
    icon: 'dark-mode',
    title: 'Dark mode',
    description: 'Use the navy and black low-light interface.',
  },
];

export function SettingsModal({
  visible,
  onClose,
  onOpenReliability,
}: Props) {
  const {
    colors,
    isDark,
    mode,
    resolvedTheme,
    setMode,
  } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>WAKESTOP</Text>
            <Text style={styles.title}>Settings</Text>
          </View>
          <Pressable
            accessibilityLabel="Close settings"
            accessibilityRole="button"
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.reliabilityButton,
              pressed && styles.pressed,
            ]}
            onPress={onOpenReliability}
          >
            <View style={styles.reliabilityIcon}>
              <Text style={styles.reliabilityIconText}>✓</Text>
            </View>
            <View style={styles.reliabilityCopy}>
              <Text style={styles.reliabilityTitle}>Reliability Center</Text>
              <Text style={styles.reliabilityBody}>
                Check permissions, Android services, and alarm tests.
              </Text>
            </View>
            <Text style={styles.reliabilityArrow}>→</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.sectionBody}>
            Choose how WakeStop looks. Your selection is saved on this device.
          </Text>

          <View style={styles.options}>
            {THEME_OPTIONS.map((option) => {
              const selected = mode === option.mode;
              return (
                <Pressable
                  key={option.mode}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setMode(option.mode)}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      selected && styles.optionIconSelected,
                    ]}
                  >
                    <MaterialIcons
                      color={selected ? colors.black : colors.ink}
                      name={option.icon}
                      size={24}
                    />
                  </View>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                    {option.mode === 'system' && selected ? (
                      <Text style={styles.systemStatus}>
                        Currently using {resolvedTheme} mode
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.paletteCard}>
            <Text style={styles.paletteTitle}>WakeStop palette</Text>
            <View style={styles.swatches}>
              <View style={[styles.swatch, { backgroundColor: '#FFFFFF' }]} />
              <View style={[styles.swatch, { backgroundColor: '#E5E5E5' }]} />
              <View style={[styles.swatch, { backgroundColor: '#FCA311' }]} />
              <View style={[styles.swatch, { backgroundColor: '#14213D' }]} />
              <View style={[styles.swatch, { backgroundColor: '#000000' }]} />
            </View>
            <Text style={styles.paletteBody}>
              Both themes use the same five-color identity with adjusted
              contrast for readability.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      minHeight: 86,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    eyebrow: {
      color: colors.orange,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.7,
    },
    title: {
      color: colors.ink,
      fontSize: 27,
      fontWeight: '900',
      marginTop: 2,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: colors.gray,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 'auto',
    },
    closeText: {
      color: colors.ink,
      fontSize: 30,
      lineHeight: 32,
      fontWeight: '500',
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 40,
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 21,
      fontWeight: '900',
      marginTop: 28,
    },
    sectionBody: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 6,
    },
    reliabilityButton: {
      minHeight: 82,
      borderRadius: 19,
      backgroundColor: colors.orange,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    reliabilityIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.black,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reliabilityIconText: {
      color: colors.white,
      fontSize: 20,
      fontWeight: '900',
    },
    reliabilityCopy: {
      flex: 1,
      paddingHorizontal: 11,
    },
    reliabilityTitle: {
      color: colors.black,
      fontSize: 14,
      fontWeight: '900',
    },
    reliabilityBody: {
      color: colors.black,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
      opacity: 0.72,
    },
    reliabilityArrow: {
      color: colors.black,
      fontSize: 23,
      fontWeight: '900',
    },
    options: {
      gap: 10,
      marginTop: 20,
    },
    option: {
      minHeight: 92,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    optionSelected: {
      borderColor: colors.orange,
      borderWidth: 2,
    },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.gray,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionIconSelected: {
      backgroundColor: colors.orange,
    },
    optionCopy: {
      flex: 1,
      paddingHorizontal: 12,
    },
    optionTitle: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    optionDescription: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },
    systemStatus: {
      color: colors.orange,
      fontSize: 10,
      fontWeight: '800',
      marginTop: 5,
      textTransform: 'capitalize',
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: colors.orange,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.orange,
    },
    paletteCard: {
      borderRadius: 20,
      backgroundColor: colors.gray,
      padding: 17,
      marginTop: 28,
    },
    paletteTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '900',
    },
    swatches: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 13,
    },
    swatch: {
      flex: 1,
      height: 34,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.ink,
    },
    paletteBody: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 12,
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.99 }],
    },
  });
}
