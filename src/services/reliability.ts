import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  Linking,
  Platform,
} from 'react-native';

import {
  ARRIVAL_CHANNEL_ID,
  BACKGROUND_LOCATION_TASK,
} from '../constants';

export type ReliabilityStatus = 'ready' | 'action' | 'info' | 'manual';

export type ReliabilityCheckId =
  | 'precise-location'
  | 'background-location'
  | 'notifications'
  | 'location-services'
  | 'alarm-channel'
  | 'background-service'
  | 'battery-optimization';

export type ReliabilityAction =
  | 'app-settings'
  | 'notification-settings'
  | 'location-settings'
  | 'battery-settings';

export type ReliabilityCheck = {
  id: ReliabilityCheckId;
  title: string;
  detail: string;
  status: ReliabilityStatus;
  action?: ReliabilityAction;
};

export type ReliabilitySnapshot = {
  checks: ReliabilityCheck[];
  checkedAt: number;
  requiredReady: number;
  requiredTotal: number;
};

const APP_PACKAGE = 'in.rentla.wakestop';

export async function getReliabilitySnapshot(): Promise<ReliabilitySnapshot> {
  const [
    foregroundPermission,
    backgroundPermission,
    notificationPermission,
    locationServicesEnabled,
    backgroundServiceRunning,
    alarmChannel,
  ] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Notifications.getPermissionsAsync(),
    Location.hasServicesEnabledAsync().catch(() => false),
    Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    ).catch(() => false),
    Platform.OS === 'android'
      ? Notifications.getNotificationChannelAsync(
          ARRIVAL_CHANNEL_ID,
        ).catch(() => null)
      : Promise.resolve(null),
  ]);

  const preciseLocation =
    foregroundPermission.granted &&
    (Platform.OS === 'android'
      ? foregroundPermission.android?.accuracy === 'fine'
      : foregroundPermission.ios?.accuracy !== 'reduced');
  const alarmChannelReady =
    Platform.OS !== 'android' ||
    Boolean(
      alarmChannel &&
        alarmChannel.importance >= Notifications.AndroidImportance.HIGH &&
        alarmChannel.sound !== null &&
        alarmChannel.enableVibrate,
    );

  const checks: ReliabilityCheck[] = [
    {
      id: 'precise-location',
      title: 'Precise location',
      detail: preciseLocation
        ? 'Fine GPS access is available.'
        : foregroundPermission.granted
          ? 'Only approximate location is allowed.'
          : 'Location permission has not been granted.',
      status: preciseLocation ? 'ready' : 'action',
      action: preciseLocation ? undefined : 'app-settings',
    },
    {
      id: 'background-location',
      title: 'Background location',
      detail: backgroundPermission.granted
        ? 'Screen-off location access is allowed.'
        : 'Choose “Allow all the time” for screen-off alarms.',
      status: backgroundPermission.granted ? 'ready' : 'action',
      action: backgroundPermission.granted ? undefined : 'app-settings',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      detail: notificationPermission.granted
        ? 'WakeStop is allowed to post alerts.'
        : 'Notifications are disabled for WakeStop.',
      status: notificationPermission.granted ? 'ready' : 'action',
      action: notificationPermission.granted
        ? undefined
        : 'notification-settings',
    },
    {
      id: 'location-services',
      title: 'Location Services',
      detail: locationServicesEnabled
        ? 'Android location providers are enabled.'
        : 'Turn on Location Services before starting a trip.',
      status: locationServicesEnabled ? 'ready' : 'action',
      action: locationServicesEnabled ? undefined : 'location-settings',
    },
    {
      id: 'alarm-channel',
      title: 'Arrival alarm channel',
      detail: alarmChannelReady
        ? Platform.OS === 'android'
          ? 'High importance, sound, and vibration are enabled.'
          : 'Notification sound permission is available.'
        : 'Enable sound, vibration, and high importance for Arrival alarms.',
      status: alarmChannelReady ? 'ready' : 'action',
      action: alarmChannelReady ? undefined : 'notification-settings',
    },
    {
      id: 'background-service',
      title: 'Active trip service',
      detail: backgroundServiceRunning
        ? 'Screen-off tracking is currently running.'
        : 'Idle. This service starts when you arm a trip.',
      status: backgroundServiceRunning ? 'ready' : 'info',
    },
    {
      id: 'battery-optimization',
      title: 'Battery optimization',
      detail:
        'Manual check: set WakeStop to Unrestricted if your Moto stops background apps.',
      status: 'manual',
      action: 'battery-settings',
    },
  ];

  const requiredChecks = checks.filter((check) =>
    [
      'precise-location',
      'background-location',
      'notifications',
      'location-services',
      'alarm-channel',
    ].includes(check.id),
  );

  return {
    checks,
    checkedAt: Date.now(),
    requiredReady: requiredChecks.filter((check) => check.status === 'ready')
      .length,
    requiredTotal: requiredChecks.length,
  };
}

export async function openReliabilityAction(
  action: ReliabilityAction,
): Promise<void> {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return;
  }

  try {
    if (action === 'notification-settings') {
      await Linking.sendIntent(
        'android.settings.CHANNEL_NOTIFICATION_SETTINGS',
        [
          {
            key: 'android.provider.extra.APP_PACKAGE',
            value: APP_PACKAGE,
          },
          {
            key: 'android.provider.extra.CHANNEL_ID',
            value: ARRIVAL_CHANNEL_ID,
          },
        ],
      );
      return;
    }

    if (action === 'location-settings') {
      await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
      return;
    }

    if (action === 'battery-settings') {
      await Linking.sendIntent(
        'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
      );
      return;
    }

    await Linking.openSettings();
  } catch {
    await Linking.openSettings();
  }
}
