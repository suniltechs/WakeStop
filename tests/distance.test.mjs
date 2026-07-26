import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatDistance,
  haversineDistanceMeters,
  progressNotificationIntervalMs,
  trackingBand,
  tripProgress,
} from '../src/utils/distance.ts';
import { resolveAlarmState } from '../src/utils/tripStatus.ts';

test('haversine distance is zero for identical coordinates', () => {
  assert.equal(
    haversineDistanceMeters(
      { latitude: 12.9716, longitude: 77.5946 },
      { latitude: 12.9716, longitude: 77.5946 },
    ),
    0,
  );
});

test('haversine distance matches one degree of latitude', () => {
  const distance = haversineDistanceMeters(
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
  );
  assert.ok(Math.abs(distance - 111_195) < 2);
});

test('distance formatting stays readable around the kilometer boundary', () => {
  assert.equal(formatDistance(null), 'Locating…');
  assert.equal(formatDistance(499.6), '500 m');
  assert.equal(formatDistance(1_250), '1.3 km');
  assert.equal(formatDistance(12_600), '13 km');
});

test('tracking bands use faster notification cadence near the stop', () => {
  assert.equal(trackingBand(10_001), 'far');
  assert.equal(progressNotificationIntervalMs(10_001), 60_000);
  assert.equal(trackingBand(5_000), 'near');
  assert.equal(progressNotificationIntervalMs(5_000), 30_000);
  assert.equal(trackingBand(500), 'close');
  assert.equal(progressNotificationIntervalMs(500), 10_000);
});

test('trip progress is clamped when moving away or passing the destination', () => {
  assert.equal(tripProgress(10_000, 7_500), 0.25);
  assert.equal(tripProgress(10_000, 12_000), 0);
  assert.equal(tripProgress(10_000, -100), 1);
  assert.equal(tripProgress(null, 500), 0);
});

test('an active alarm stays ringing on later GPS updates', () => {
  assert.deepEqual(resolveAlarmState('ringing', 300, 500, null, 1_000), {
    status: 'ringing',
    shouldAlarm: false,
    snoozeIsActive: false,
  });
});

test('snooze suppresses the alarm until it expires', () => {
  assert.deepEqual(resolveAlarmState('snoozed', 100, 500, 2_000, 1_000), {
    status: 'snoozed',
    shouldAlarm: false,
    snoozeIsActive: true,
  });
  assert.deepEqual(resolveAlarmState('snoozed', 100, 500, 2_000, 2_001), {
    status: 'ringing',
    shouldAlarm: true,
    snoozeIsActive: false,
  });
});
