import { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';
import type { ActiveTrip } from '../types';
import { formatDistance } from '../utils/distance';

type Props = {
  trip: ActiveTrip;
  busy: boolean;
  isTest?: boolean;
  onSnooze: () => void;
  onDismiss: () => void;
};

export function AlarmScreen({
  trip,
  busy,
  isTest = false,
  onSnooze,
  onDismiss,
}: Props) {
  const player = useAudioPlayer(require('../../assets/alarm.wav'));

  useEffect(() => {
    let mounted = true;

    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).then(() => {
      if (!mounted) return;
      player.loop = true;
      player.volume = 1;
      player.setActiveForLockScreen(true, {
        title: 'Wake up — your stop is close',
        artist: 'WakeStop',
        albumTitle: trip.destination.name,
      });
      player.play();
    });

    Vibration.vibrate([0, 900, 250, 900, 250, 1_300], true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    return () => {
      mounted = false;
      Vibration.cancel();
    };
  }, [player, trip.destination.name]);

  const stopPlayback = () => {
    Vibration.cancel();
    player.pause();
    player.setActiveForLockScreen(false);
  };

  const handleDismissPress = () => {
    stopPlayback();
    onDismiss();
  };

  const handleSnoozePress = () => {
    stopPlayback();
    onSnooze();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.top}>
        <View style={styles.ringingPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.ringingText}>
            {isTest ? 'TEST ALARM' : 'ARRIVAL ALARM'}
          </Text>
        </View>
        <Text style={styles.icon}>◉</Text>
        <Text style={styles.title}>{isTest ? 'Alarm test' : 'Wake up!'}</Text>
        <Text style={styles.destination}>{trip.destination.name}</Text>
        <Text style={styles.distance}>
          {formatDistance(trip.lastDistanceMeters)} away
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && styles.buttonPressed,
            busy && styles.buttonDisabled,
          ]}
          onPress={handleDismissPress}
        >
          <Text style={styles.dismissText}>
            {busy
              ? 'Stopping…'
              : isTest
                ? 'Stop test alarm'
                : 'Dismiss alarm'}
          </Text>
          <Text style={styles.dismissHint}>
            {isTest
              ? 'Closes the notification and stops sound'
              : 'Stops location tracking'}
          </Text>
        </Pressable>

        {!isTest ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={({ pressed }) => [
              styles.snoozeButton,
              pressed && styles.buttonPressed,
              busy && styles.buttonDisabled,
            ]}
            onPress={handleSnoozePress}
          >
            <Text style={styles.snoozeText}>Snooze for 5 minutes</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.alarm,
    paddingHorizontal: 24,
  },
  top: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 34,
  },
  pulseDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.orange,
    marginRight: 8,
  },
  ringingText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  icon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.white,
    color: colors.alarm,
    fontSize: 66,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 106,
    overflow: 'hidden',
  },
  title: {
    color: colors.white,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginTop: 22,
  },
  destination: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  distance: {
    color: colors.gray,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  actions: {
    paddingBottom: 20,
    gap: 12,
  },
  dismissButton: {
    minHeight: 78,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: colors.alarmDark,
    fontSize: 20,
    fontWeight: '900',
  },
  dismissHint: {
    color: colors.ink,
    fontSize: 12,
    marginTop: 3,
  },
  snoozeButton: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
