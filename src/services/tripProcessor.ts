import type { ActiveTrip, Coordinates } from '../types';
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

export async function processTripLocation(
  current: Coordinates,
  timestamp = Date.now(),
  allowProgressNotification = true,
): Promise<ActiveTrip | null> {
  const trip = await getActiveTrip();
  if (!trip) return null;

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
