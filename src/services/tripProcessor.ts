import type { ActiveTrip, LocationReading } from '../types';
import {
  haversineDistanceMeters,
  progressNotificationIntervalMs,
} from '../utils/distance';
import { resolveAlarmState } from '../utils/tripStatus';
import {
  showArrivalAlarm,
  showProgressNotification,
} from './notifications';
import { getActiveTrip, setActiveTrip } from './storage';

// A fix is ignored when its reported accuracy is worse than this multiple
// of the alarm radius, so a noisy fix cannot trigger or block the alarm.
export const UNRELIABLE_ACCURACY_RADIUS_MULTIPLIER = 2;

export async function processTripLocation(
  current: LocationReading,
  timestamp = Date.now(),
  allowProgressNotification = true,
): Promise<ActiveTrip | null> {
  const trip = await getActiveTrip();
  if (!trip) return null;

  const isReliable =
    current.accuracyMeters === null ||
    current.accuracyMeters <=
      trip.radiusMeters * UNRELIABLE_ACCURACY_RADIUS_MULTIPLIER;

  // Keep the latest accuracy visible to the UI even for ignored fixes, but
  // never let an unreliable fix feed distance or alarm calculations.
  if (!isReliable) {
    const skippedTrip: ActiveTrip = {
      ...trip,
      lastAccuracyMeters: current.accuracyMeters,
    };
    await setActiveTrip(skippedTrip);
    return skippedTrip;
  }

  const distance = haversineDistanceMeters(current, trip.destination);
  const alarmState = resolveAlarmState(
    trip.status,
    distance,
    trip.radiusMeters,
    trip.snoozedUntil,
    timestamp,
  );
  const progressInterval = progressNotificationIntervalMs(distance);
  const shouldUpdateProgress =
    allowProgressNotification &&
    alarmState.status !== 'ringing' &&
    (trip.lastProgressNotificationAt === null ||
      timestamp - trip.lastProgressNotificationAt >= progressInterval);

  const nextTrip: ActiveTrip = {
    ...trip,
    status: alarmState.status,
    initialDistanceMeters: trip.initialDistanceMeters ?? distance,
    lastDistanceMeters: distance,
    lastLocation: current,
    lastUpdatedAt: timestamp,
    lastAccuracyMeters: current.accuracyMeters,
    lastReliableUpdateAt: timestamp,
    lastProgressNotificationAt: shouldUpdateProgress
      ? timestamp
      : trip.lastProgressNotificationAt,
    alarmTriggeredAt: alarmState.shouldAlarm
      ? timestamp
      : trip.alarmTriggeredAt,
    snoozedUntil: alarmState.snoozeIsActive ? trip.snoozedUntil : null,
  };

  // Persist first so concurrent foreground/background callbacks see the flag.
  await setActiveTrip(nextTrip);

  if (alarmState.shouldAlarm) {
    await showArrivalAlarm(nextTrip);
  } else if (shouldUpdateProgress) {
    await showProgressNotification(nextTrip);
  }

  return nextTrip;
}
