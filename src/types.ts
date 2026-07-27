export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Destination = Coordinates & {
  placeId: string;
  name: string;
  address: string;
};

export type TripStatus = 'tracking' | 'ringing' | 'snoozed';

export type ActiveTrip = {
  id: string;
  destination: Destination;
  radiusMeters: number;
  startedAt: number;
  status: TripStatus;
  initialDistanceMeters: number | null;
  lastDistanceMeters: number | null;
  lastLocation: Coordinates | null;
  lastUpdatedAt: number | null;
  lastProgressNotificationAt: number | null;
  alarmTriggeredAt: number | null;
  snoozedUntil: number | null;
};

export type SavedRoute = {
  id: string;
  label: string;
  destination: Destination;
  radiusMeters: number;
  createdAt: number;
};

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
  latitude: number;
  longitude: number;
};

export type AlarmTestResult = {
  kind: 'foreground' | 'screen-off';
  status: 'scheduled' | 'completed';
  timestamp: number;
};
