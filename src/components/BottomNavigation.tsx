import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppColors } from '../theme';
import { useAppTheme } from '../themeContext';

export type AppTab = 'home' | 'saved' | 'settings';

type Props = {
  activeTab: AppTab;
  tripActive: boolean;
  onChange: (tab: AppTab) => void;
  onChooseMap: () => void;
};

const TABS: Array<{
  id: AppTab | 'map';
  icon: string;
  label: string;
}> = [
  { id: 'home', icon: '⌂', label: 'Home' },
  { id: 'map', icon: '⌖', label: 'Map' },
  { id: 'saved', icon: '★', label: 'Saved' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

export function BottomNavigation({
  activeTab,
  tripActive,
  onChange,
  onChooseMap,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [barWidth, setBarWidth] = useState(0);
  const [displayedTab, setDisplayedTab] =
    useState<AppTab>(activeTab);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorScale = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;
  const positioned = useRef(false);
  const transitionId = useRef(0);
  const activeIndex = TABS.findIndex((tab) => tab.id === activeTab);
  const displayedItem =
    TABS.find((tab) => tab.id === displayedTab) ?? TABS[0];

  useEffect(() => {
    if (barWidth <= 0 || activeIndex < 0) return;

    const itemWidth = barWidth / TABS.length;
    const targetX = activeIndex * itemWidth + (itemWidth - 78) / 2;

    if (!positioned.current) {
      indicatorX.setValue(targetX);
      setDisplayedTab(activeTab);
      positioned.current = true;
      return;
    }

    indicatorX.stopAnimation();
    indicatorScale.stopAnimation();
    iconOpacity.stopAnimation();
    transitionId.current += 1;
    const currentTransition = transitionId.current;

    Animated.spring(indicatorX, {
      toValue: targetX,
      damping: 18,
      mass: 0.75,
      stiffness: 185,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(iconOpacity, {
          toValue: 0,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorScale, {
          toValue: 0.9,
          duration: 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(20),
    ]).start(({ finished }) => {
      if (!finished || currentTransition !== transitionId.current) return;
      setDisplayedTab(activeTab);
      Animated.parallel([
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(indicatorScale, {
          toValue: 1,
          damping: 12,
          mass: 0.7,
          stiffness: 210,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [
    activeIndex,
    activeTab,
    barWidth,
    iconOpacity,
    indicatorScale,
    indicatorX,
  ]);

  const handleBarLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (Math.abs(nextWidth - barWidth) < 0.5) return;
    positioned.current = false;
    setBarWidth(nextWidth);
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.shell}>
        <View
          accessibilityRole="tablist"
          style={styles.bar}
          onLayout={handleBarLayout}
        >
          {barWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeHalo,
                {
                  transform: [
                    { translateX: indicatorX },
                    { scale: indicatorScale },
                  ],
                },
              ]}
            >
              <View style={styles.activeButton}>
                <Animated.Text
                  style={[
                    styles.activeIcon,
                    { opacity: iconOpacity },
                  ]}
                >
                  {displayedItem.icon}
                </Animated.Text>
                {displayedTab === 'home' && tripActive ? (
                  <View style={styles.activeLiveBadge} />
                ) : null}
              </View>
            </Animated.View>
          ) : null}
          {TABS.map((tab) => {
            const selected = tab.id !== 'map' && activeTab === tab.id;
            const showTripBadge = tab.id === 'home' && tripActive;

            return (
              <Pressable
                key={tab.id}
                accessibilityLabel={
                  tab.id === 'map'
                    ? 'Choose destination on map'
                    : `${tab.label} tab`
                }
                accessibilityRole={tab.id === 'map' ? 'button' : 'tab'}
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.tab,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  if (tab.id === 'map') onChooseMap();
                  else onChange(tab.id);
                }}
              >
                <View style={styles.iconWrap}>
                  {!selected ? (
                    <>
                      <Text style={styles.icon}>{tab.icon}</Text>
                      {showTripBadge ? <View style={styles.liveBadge} /> : null}
                    </>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.label,
                    selected && styles.labelSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: colors.teal,
      position: 'relative',
      zIndex: 20,
    },
    shell: {
      backgroundColor: colors.background,
      position: 'relative',
      zIndex: 20,
    },
    bar: {
      minHeight: 70,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: colors.teal,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      overflow: 'visible',
    },
    tab: {
      flex: 1,
      minHeight: 70,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 10,
      paddingBottom: 7,
      overflow: 'visible',
      zIndex: 2,
    },
    activeHalo: {
      width: 78,
      height: 78,
      borderRadius: 39,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      top: -39,
      left: 0,
      zIndex: 5,
    },
    activeButton: {
      width: 58,
      height: 58,
      borderRadius: 29,
      borderWidth: 1,
      borderColor: colors.orange,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: colors.black,
      shadowOpacity: 0.24,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 4 },
    },
    activeIcon: {
      color: colors.orange,
      fontSize: 24,
      lineHeight: 27,
      fontWeight: '900',
    },
    iconWrap: {
      minWidth: 28,
      minHeight: 27,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      color: colors.white,
      fontSize: 21,
      lineHeight: 25,
      fontWeight: '900',
      opacity: 0.68,
    },
    label: {
      color: colors.white,
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '800',
      marginTop: 2,
      opacity: 0.66,
    },
    labelSelected: {
      color: colors.orange,
      opacity: 1,
    },
    liveBadge: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.surface,
      backgroundColor: colors.orange,
      position: 'absolute',
      right: -4,
      top: 0,
    },
    activeLiveBadge: {
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.background,
      backgroundColor: colors.orange,
      position: 'absolute',
      right: 4,
      top: 4,
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.98 }],
    },
  });
}
