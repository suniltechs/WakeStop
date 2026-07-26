export type ResolvedAlarmState = {
  status: 'tracking' | 'ringing' | 'snoozed';
  shouldAlarm: boolean;
  snoozeIsActive: boolean;
};

export function resolveAlarmState(
  currentStatus: ResolvedAlarmState['status'],
  distanceMeters: number,
  radiusMeters: number,
  snoozedUntil: number | null,
  now: number,
): ResolvedAlarmState {
  if (currentStatus === 'ringing') {
    return {
      status: 'ringing',
      shouldAlarm: false,
      snoozeIsActive: false,
    };
  }

  const snoozeIsActive = snoozedUntil !== null && snoozedUntil > now;
  if (snoozeIsActive) {
    return {
      status: 'snoozed',
      shouldAlarm: false,
      snoozeIsActive: true,
    };
  }

  if (distanceMeters <= radiusMeters) {
    return {
      status: 'ringing',
      shouldAlarm: true,
      snoozeIsActive: false,
    };
  }

  return {
    status: 'tracking',
    shouldAlarm: false,
    snoozeIsActive: false,
  };
}
