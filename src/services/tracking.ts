import * as Location from 'expo-location';

import {
  BACKGROUND_LOCATION_TASK,
  SNOOZE_DURATION_MS,
} from '../constants';
import type { ActiveTrip, Coordinates, Destination } from '../types';
import { haversineDistanceMeters } from '../utils/distance';
import { createId } from '../utils/id';
import {
  dismissTripNotifications,
  requestNotificationPermission,
} from './notifications';
import {
  clearActiveTrip,
  getActiveTrip,
  setActiveTrip,
} from './storage';

export type TripStartResult = {
  trip: ActiveTrip;
  backgroundEnabled: boolean;
  notificationsEnabled: boolean;
};

export async function requestTripPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
  notifications: boolean;
}> {
  const foregroundResult = await Location.requestForegroundPermissionsAsync();
  if (!foregroundResult.granted) {
    return { foreground: false, background: false, notifications: false };
  }

  const notifications = await requestNotificationPermission();
  const backgroundResult =
    await Location.requestBackgroundPermissionsAsync().catch(() => null);

  return {
    foreground: true,
    background: backgroundResult?.granted ?? false,
    notifications,
  };
}

export async function startTrip(
  destination: Destination,
  radiusMeters: number,
): Promise<TripStartResult> {
  const permissions = await requestTripPermissions();
  if (!permissions.foreground) {
    throw new Error(
      'Precise location permission is required to calculate the distance to your stop.',
    );
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error('Turn on Location Services before starting a trip.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  const current: Coordinates = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
  const initialDistanceMeters = haversineDistanceMeters(current, destination);
  const now = Date.now();
  const trip: ActiveTrip = {
    id: createId('trip'),
    destination,
    radiusMeters,
    startedAt: now,
    status: 'tracking',
    initialDistanceMeters,
    lastDistanceMeters: initialDistanceMeters,
    lastLocation: current,
    lastUpdatedAt: now,
    lastProgressNotificationAt: null,
    alarmTriggeredAt: null,
    snoozedUntil: null,
  };

  await setActiveTrip(trip);

  if (permissions.background) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000,
      distanceInterval: 25,
      deferredUpdatesDistance: 50,
      deferredUpdatesInterval: 15_000,
      activityType: Location.ActivityType.OtherNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'WakeStop trip is armed',
        notificationBody: `Tracking your distance to ${destination.name}.`,
        notificationColor: '#1C7C68',
        killServiceOnDestroy: false,
      },
    });
  }

  return {
    trip,
    backgroundEnabled: permissions.background,
    notificationsEnabled: permissions.notifications,
  };
}

export async function stopTrip(): Promise<void> {
  const trip = await getActiveTrip();
  const isTracking =
    await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    ).catch(() => false);

  if (isTracking) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  await dismissTripNotifications(trip?.id);
  await clearActiveTrip();
}

export async function snoozeTrip(): Promise<ActiveTrip | null> {
  const trip = await getActiveTrip();
  if (!trip) return null;

  const nextTrip: ActiveTrip = {
    ...trip,
    status: 'snoozed',
    snoozedUntil: Date.now() + SNOOZE_DURATION_MS,
    alarmTriggeredAt: null,
  };
  await dismissTripNotifications(trip.id);
  await setActiveTrip(nextTrip);
  return nextTrip;
}
