import type { Coordinates } from '../types';

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineDistanceMeters(
  start: Coordinates,
  end: Coordinates,
): number {
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    EARTH_RADIUS_METERS *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

export function formatDistance(distanceMeters: number | null): string {
  if (distanceMeters === null || !Number.isFinite(distanceMeters)) {
    return 'Locating…';
  }

  if (distanceMeters < 1_000) {
    return `${Math.max(0, Math.round(distanceMeters))} m`;
  }

  const kilometers = distanceMeters / 1_000;
  return `${kilometers < 10 ? kilometers.toFixed(1) : Math.round(kilometers)} km`;
}

export function trackingBand(distanceMeters: number): 'far' | 'near' | 'close' {
  if (distanceMeters > 10_000) return 'far';
  if (distanceMeters > 2_000) return 'near';
  return 'close';
}

export function progressNotificationIntervalMs(distanceMeters: number): number {
  switch (trackingBand(distanceMeters)) {
    case 'far':
      return 60_000;
    case 'near':
      return 30_000;
    case 'close':
      return 10_000;
  }
}

export function tripProgress(
  initialDistanceMeters: number | null,
  currentDistanceMeters: number | null,
): number {
  if (
    initialDistanceMeters === null ||
    currentDistanceMeters === null ||
    initialDistanceMeters <= 0
  ) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(0, (initialDistanceMeters - currentDistanceMeters) / initialDistanceMeters),
  );
}
