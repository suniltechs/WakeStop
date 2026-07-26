import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ACTIVE_TRIP_STORAGE_KEY,
  ALARM_TEST_RESULT_STORAGE_KEY,
  SAVED_ROUTES_STORAGE_KEY,
} from '../constants';
import type {
  ActiveTrip,
  AlarmTestResult,
  SavedRoute,
} from '../types';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getActiveTrip(): Promise<ActiveTrip | null> {
  return readJson<ActiveTrip | null>(ACTIVE_TRIP_STORAGE_KEY, null);
}

export async function setActiveTrip(trip: ActiveTrip): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(trip));
}

export async function clearActiveTrip(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
}

export function getSavedRoutes(): Promise<SavedRoute[]> {
  return readJson<SavedRoute[]>(SAVED_ROUTES_STORAGE_KEY, []);
}

export async function setSavedRoutes(routes: SavedRoute[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_ROUTES_STORAGE_KEY, JSON.stringify(routes));
}

export async function addSavedRoute(route: SavedRoute): Promise<SavedRoute[]> {
  const routes = await getSavedRoutes();
  const duplicateIndex = routes.findIndex(
    (candidate) =>
      candidate.destination.placeId === route.destination.placeId &&
      candidate.radiusMeters === route.radiusMeters,
  );

  const nextRoutes =
    duplicateIndex >= 0
      ? routes.map((candidate, index) =>
          index === duplicateIndex ? route : candidate,
        )
      : [route, ...routes];

  await setSavedRoutes(nextRoutes);
  return nextRoutes;
}

export async function removeSavedRoute(id: string): Promise<SavedRoute[]> {
  const routes = await getSavedRoutes();
  const nextRoutes = routes.filter((route) => route.id !== id);
  await setSavedRoutes(nextRoutes);
  return nextRoutes;
}

export function getAlarmTestResult(): Promise<AlarmTestResult | null> {
  return readJson<AlarmTestResult | null>(
    ALARM_TEST_RESULT_STORAGE_KEY,
    null,
  );
}

export async function setAlarmTestResult(
  result: AlarmTestResult,
): Promise<void> {
  await AsyncStorage.setItem(
    ALARM_TEST_RESULT_STORAGE_KEY,
    JSON.stringify(result),
  );
}
