import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, {
  Circle,
  Marker,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

import type { AppColors } from '../theme';
import { useAppTheme } from '../themeContext';
import type { Coordinates, Destination } from '../types';

type Props = {
  destination: Destination;
  currentLocation?: Coordinates | null;
  radiusMeters: number;
  height?: number;
};

export function TripMap({
  destination,
  currentLocation,
  radiusMeters,
  height = 220,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackIcon}>⌖</Text>
        <Text style={styles.fallbackTitle}>Map preview is optional</Text>
        <Text style={styles.fallbackBody}>
          Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to .env to show Google Maps.
        </Text>
      </View>
    );
  }

  const latitudeDelta = currentLocation
    ? Math.max(
        0.015,
        Math.abs(currentLocation.latitude - destination.latitude) * 1.7,
      )
    : 0.02;
  const longitudeDelta = currentLocation
    ? Math.max(
        0.015,
        Math.abs(currentLocation.longitude - destination.longitude) * 1.7,
      )
    : 0.02;
  const center = currentLocation
    ? {
        latitude: (currentLocation.latitude + destination.latitude) / 2,
        longitude: (currentLocation.longitude + destination.longitude) / 2,
      }
    : destination;

  return (
    <MapView
      key={destination.placeId}
      provider={PROVIDER_GOOGLE}
      pitchEnabled={false}
      rotateEnabled={false}
      toolbarEnabled={false}
      style={[styles.map, { height }]}
      region={{ ...center, latitudeDelta, longitudeDelta }}
    >
      <Marker
        coordinate={destination}
        title={destination.name}
        description={destination.address}
        pinColor={colors.orange}
      />
      <Circle
        center={destination}
        radius={radiusMeters}
        strokeColor="rgba(252, 163, 17, 0.9)"
        fillColor="rgba(252, 163, 17, 0.16)"
      />
      {currentLocation ? (
        <Marker
          coordinate={currentLocation}
          title="You"
          pinColor={colors.teal}
        />
      ) : null}
    </MapView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  map: {
    width: '100%',
    borderRadius: 20,
  },
  fallback: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.gray,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  fallbackIcon: {
    color: colors.teal,
    fontSize: 30,
    fontWeight: '800',
  },
  fallbackTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 15,
    marginTop: 7,
  },
  fallbackBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 5,
  },
  });
}
