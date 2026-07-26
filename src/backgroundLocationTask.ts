import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { BACKGROUND_LOCATION_TASK } from './constants';
import type { Coordinates } from './types';
import { processTripLocation } from './services/tripProcessor';

type BackgroundLocationData = {
  locations: Location.LocationObject[];
};

TaskManager.defineTask<BackgroundLocationData>(
  BACKGROUND_LOCATION_TASK,
  async ({ data, error }) => {
    if (error || !data?.locations?.length) return;

    const latest = data.locations[data.locations.length - 1];
    const current: Coordinates = {
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
    };
    await processTripLocation(current, latest.timestamp);
  },
);
