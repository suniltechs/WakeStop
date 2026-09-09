import { useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@react-native-vector-icons/ant-design/static';
import { SimpleLineIcons } from '@react-native-vector-icons/simple-line-icons/static';

import type { AppColors } from '../theme';
import { useAppTheme } from '../themeContext';

export type AppTab = 'home' | 'saved' | 'settings';

type Props = {
  activeTab: AppTab;
  tripActive: boolean;
  onChange: (tab: AppTab) => void;
};

type NavItem = {
  id: AppTab;
  icon: 'home' | 'bookmark' | 'settings';
  label: string;
};

const TABS: NavItem[] = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'saved', icon: 'bookmark', label: 'Saved' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

type NavIconProps = {
  color: string;
  name: NavItem['icon'];
};

function NavIcon({ color, name }: NavIconProps) {
  if (name === 'settings') {
    return <SimpleLineIcons color={color} name="settings" size={24} />;
  }

  if (name === 'home') {
    return <AntDesign color={color} name="home" size={24} />;
  }

  if (name === 'bookmark') {
    return (
      <View style={iconStyles.canvas}>
        <View style={[iconStyles.bookmarkBody, { borderColor: color }]} />
        <View
          style={[
            iconStyles.bookmarkNotchLeft,
            { backgroundColor: color },
          ]}
        />
        <View
          style={[
            iconStyles.bookmarkNotchRight,
            { backgroundColor: color },
          ]}
        />
      </View>
    );
  }

  return null;
}

export function BottomNavigation({
  activeTab,
  tripActive,
  onChange,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleChange = (tab: AppTab) => {
    if (tab === activeTab) return;
    void Haptics.selectionAsync().catch(() => undefined);
    onChange(tab);
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View accessibilityRole="tablist" style={styles.bar}>
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          const showTripBadge = tab.id === 'home' && tripActive;
          const visibleLabel = showTripBadge ? 'Trip' : tab.label;

          return (
            <Pressable
              key={tab.id}
              accessibilityHint={
                showTripBadge
                  ? 'Opens your active location alarm'
                  : undefined
              }
              accessibilityLabel={`${visibleLabel} tab`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              hitSlop={4}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.pressed,
              ]}
              onPress={() => handleChange(tab.id)}
            >
              <View style={styles.iconWrap}>
                <NavIcon
                  color={selected ? colors.orange : colors.muted}
                  name={tab.icon}
                />
                {showTripBadge ? (
                  <View
                    accessibilityLabel="Trip active"
                    style={[
                      styles.liveBadge,
                      selected && styles.liveBadgeSelected,
                    ]}
                  />
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  selected && styles.labelSelected,
                ]}
              >
                {visibleLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const iconStyles = StyleSheet.create({
  canvas: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkBody: {
    width: 18,
    height: 23,
    borderTopWidth: 2.2,
    borderLeftWidth: 2.2,
    borderRightWidth: 2.2,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    position: 'absolute',
    top: 1,
  },
  bookmarkNotchLeft: {
    width: 11,
    height: 2.2,
    borderRadius: 2,
    position: 'absolute',
    left: 3,
    bottom: 5,
    transform: [{ rotate: '42deg' }],
  },
  bookmarkNotchRight: {
    width: 11,
    height: 2.2,
    borderRadius: 2,
    position: 'absolute',
    right: 3,
    bottom: 5,
    transform: [{ rotate: '-42deg' }],
  },
});

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      position: 'relative',
      zIndex: 20,
    },
    bar: {
      height: 56,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    tab: {
      flex: 1,
      minWidth: 64,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
      marginTop: 2,
    },
    labelSelected: {
      color: colors.orange,
      fontWeight: '600',
    },
    iconWrap: {
      width: 30,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    liveBadge: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.surface,
      backgroundColor: colors.orange,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    liveBadgeSelected: {
      borderColor: colors.surface,
      backgroundColor: colors.orange,
    },
    pressed: {
      opacity: 0.68,
      transform: [{ scale: 0.97 }],
    },
  });
}
