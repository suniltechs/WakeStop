import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  ALARM_CATEGORY_ID,
  ALARM_SOUND_FILE,
  ARRIVAL_CHANNEL_ID,
  DISMISS_ACTION_ID,
  PROGRESS_CHANNEL_ID,
  PROGRESS_NOTIFICATION_ID,
  SNOOZE_ACTION_ID,
} from '../constants';
import type { ActiveTrip } from '../types';
import { formatDistance } from '../utils/distance';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isArrival =
      notification.request.content.data?.type === 'arrival-alarm';
    return {
      shouldShowBanner: isArrival,
      shouldShowList: true,
      shouldPlaySound: isArrival,
      shouldSetBadge: false,
      priority: isArrival
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.LOW,
    };
  },
});

export async function configureNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ARRIVAL_CHANNEL_ID, {
      name: 'Arrival alarms',
      description: 'Loud alerts when you reach your destination radius.',
      importance: Notifications.AndroidImportance.MAX,
      sound: ALARM_SOUND_FILE,
      vibrationPattern: [0, 800, 250, 800, 250, 1_200],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#F26B38',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: false,
        },
      },
    });

    await Notifications.setNotificationChannelAsync(PROGRESS_CHANNEL_ID, {
      name: 'Active trip distance',
      description: 'Silent live distance updates while an alarm is armed.',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_ID, [
    {
      identifier: SNOOZE_ACTION_ID,
      buttonTitle: 'Snooze 5 min',
      options: { opensAppToForeground: true },
    },
    {
      identifier: DISMISS_ACTION_ID,
      buttonTitle: 'Dismiss',
      options: { opensAppToForeground: true, isDestructive: true },
    },
  ]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return requested.granted;
}

export async function showArrivalAlarm(trip: ActiveTrip): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    identifier: `arrival-${trip.id}`,
    content: {
      title: 'Wake up — your stop is close!',
      body: `${trip.destination.name} is ${formatDistance(
        trip.lastDistanceMeters,
      )} away.`,
      data: { type: 'arrival-alarm', tripId: trip.id },
      categoryIdentifier: ALARM_CATEGORY_ID,
      sound: ALARM_SOUND_FILE,
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 800, 250, 800, 250, 1_200],
      color: '#F26B38',
      interruptionLevel: 'timeSensitive',
      autoDismiss: false,
    },
    trigger:
      Platform.OS === 'android' ? { channelId: ARRIVAL_CHANNEL_ID } : null,
  });
}

export async function showProgressNotification(
  trip: ActiveTrip,
): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.scheduleNotificationAsync({
    identifier: PROGRESS_NOTIFICATION_ID,
    content: {
      title: `Trip armed · ${formatDistance(trip.lastDistanceMeters)} left`,
      body: `WakeStop is watching for ${trip.destination.name}.`,
      data: { type: 'trip-progress', tripId: trip.id },
      priority: Notifications.AndroidNotificationPriority.LOW,
      sound: false,
      sticky: true,
      autoDismiss: false,
      color: '#1C7C68',
    },
    trigger: { channelId: PROGRESS_CHANNEL_ID },
  });
}

export async function dismissTripNotifications(
  tripId?: string,
): Promise<void> {
  await Notifications.dismissNotificationAsync(PROGRESS_NOTIFICATION_ID).catch(
    () => undefined,
  );
  if (tripId) {
    await Notifications.dismissNotificationAsync(`arrival-${tripId}`).catch(
      () => undefined,
    );
  }
}
