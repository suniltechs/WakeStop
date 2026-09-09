import { useCallback, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';

type Props = {
  onComplete: () => void;
};

const INTRO_HOLD_MS = 2_350;
const REDUCED_MOTION_HOLD_MS = 700;

export function IntroScreen({ onComplete }: Props) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(18)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(12)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const finishing = useRef(false);
  const reduceMotion = useRef(false);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;

    if (reduceMotion.current) {
      onComplete();
      return;
    }

    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onComplete());
  }, [onComplete, screenOpacity]);

  useEffect(() => {
    let active = true;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let entrance: Animated.CompositeAnimation | undefined;
    let pulseLoop: Animated.CompositeAnimation | undefined;

    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((isReduced) => {
        if (!active) return;
        reduceMotion.current = isReduced;

        if (isReduced) {
          logoOpacity.setValue(1);
          logoScale.setValue(1);
          wordmarkOpacity.setValue(1);
          wordmarkTranslateY.setValue(0);
          taglineOpacity.setValue(1);
          taglineTranslateY.setValue(0);
          finishTimer = setTimeout(finish, REDUCED_MOTION_HOLD_MS);
          return;
        }

        entrance = Animated.sequence([
          Animated.delay(100),
          Animated.parallel([
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
              toValue: 1,
              damping: 13,
              stiffness: 145,
              mass: 0.8,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(wordmarkOpacity, {
              toValue: 1,
              duration: 360,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(wordmarkTranslateY, {
              toValue: 0,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(taglineOpacity, {
              toValue: 1,
              duration: 380,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(taglineTranslateY, {
              toValue: 0,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]);

        pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1,
              duration: 1_650,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        );

        entrance.start();
        pulseLoop.start();
        finishTimer = setTimeout(finish, INTRO_HOLD_MS);
      });

    return () => {
      active = false;
      if (finishTimer) clearTimeout(finishTimer);
      entrance?.stop();
      pulseLoop?.stop();
    };
  }, [
    finish,
    logoOpacity,
    logoScale,
    pulse,
    taglineOpacity,
    taglineTranslateY,
    wordmarkOpacity,
    wordmarkTranslateY,
  ]);

  const nearRingScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1.28],
  });
  const farRingScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.68, 1.58],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.34, 0],
  });

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      <StatusBar style="light" />
      <Pressable
        accessibilityHint="Skips the intro animation"
        accessibilityLabel="WakeStop introduction"
        accessibilityRole="button"
        style={styles.pressable}
        onPress={finish}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.ambientTop} />
          <View style={styles.ambientBottom} />

          <View style={styles.center}>
            <View style={styles.logoStage}>
              <Animated.View
                style={[
                  styles.ring,
                  styles.nearRing,
                  {
                    opacity: ringOpacity,
                    transform: [{ scale: nearRingScale }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.ring,
                  styles.farRing,
                  {
                    opacity: ringOpacity,
                    transform: [{ scale: farRingScale }],
                  },
                ]}
              />

              <Animated.View
                style={[
                  styles.logoShell,
                  {
                    opacity: logoOpacity,
                    transform: [{ scale: logoScale }],
                  },
                ]}
              >
                <Image
                  resizeMode="contain"
                  source={require('../../assets/logo_1.png')}
                  style={styles.logoImage}
                />
              </Animated.View>
            </View>

            <Animated.View
              style={[
                styles.wordmarkGroup,
                {
                  opacity: wordmarkOpacity,
                  transform: [{ translateY: wordmarkTranslateY }],
                },
              ]}
            >
              <Text style={styles.wordmark}>WakeStop</Text>
              <View style={styles.wordmarkUnderline} />
            </Animated.View>

            <Animated.View
              style={[
                styles.taglineGroup,
                {
                  opacity: taglineOpacity,
                  transform: [{ translateY: taglineTranslateY }],
                },
              ]}
            >
              <Text style={styles.tagline}>SLEEP THROUGH THE RIDE</Text>
              <Text style={styles.taglineAccent}>NOT YOUR STOP.</Text>
            </Animated.View>
          </View>

          <Animated.View
            style={[styles.footer, { opacity: taglineOpacity }]}
          >
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>LOCAL LOCATION ALARMS</Text>
            <Text style={styles.skipText}>Tap to continue</Text>
          </Animated.View>
        </SafeAreaView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.ink,
  },
  pressable: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    overflow: 'hidden',
  },
  ambientTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -190,
    right: -120,
    backgroundColor: colors.orange,
    opacity: 0.18,
  },
  ambientBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: -190,
    left: -130,
    backgroundColor: colors.gray,
    opacity: 0.1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 26,
  },
  logoStage: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.tealSoft,
  },
  nearRing: {
    width: 142,
    height: 142,
    borderRadius: 71,
  },
  farRing: {
    width: 172,
    height: 172,
    borderRadius: 86,
  },
  logoShell: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 110,
    height: 110,
  },

  wordmarkGroup: {
    alignItems: 'center',
    marginTop: 7,
  },
  wordmark: {
    color: colors.white,
    fontSize: 43,
    lineHeight: 49,
    fontWeight: '900',
    letterSpacing: -1.4,
  },
  wordmarkUnderline: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.orange,
    marginTop: 12,
  },
  taglineGroup: {
    alignItems: 'center',
    marginTop: 28,
  },
  tagline: {
    color: colors.gray,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  taglineAccent: {
    color: colors.orange,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  footer: {
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.teal,
    marginBottom: 7,
  },
  footerText: {
    color: colors.gray,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  skipText: {
    color: colors.gray,
    fontSize: 10,
    marginTop: 6,
  },
});
