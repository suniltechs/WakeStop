import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  Marker,
} from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppColors } from '../theme';
import { useAppTheme } from '../themeContext';
import type { Coordinates, Destination } from '../types';

export const OPEN_FREE_MAP_LIGHT =
  'https://tiles.openfreemap.org/styles/liberty';
export const OPEN_FREE_MAP_DARK =
  'https://tiles.openfreemap.org/styles/fiord';
const METERS_PER_LATITUDE_DEGREE = 111_320;

type Props = {
  destination: Destination;
  currentLocation?: Coordinates | null;
  radiusMeters: number;
  height?: number;
  onPress?: () => void;
};

export function createRadiusFeature(
  destination: Destination,
  radiusMeters: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const latitudeRadians = (destination.latitude * Math.PI) / 180;
  const latitudeRadius = radiusMeters / METERS_PER_LATITUDE_DEGREE;
  const longitudeRadius =
    radiusMeters /
    (METERS_PER_LATITUDE_DEGREE *
      Math.max(0.01, Math.cos(latitudeRadians)));
  const coordinates: [number, number][] = [];

  for (let index = 0; index <= 64; index += 1) {
    const angle = (index / 64) * Math.PI * 2;
    coordinates.push([
      destination.longitude + Math.cos(angle) * longitudeRadius,
      destination.latitude + Math.sin(angle) * latitudeRadius,
    ]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

function createMapBounds(
  destination: Destination,
  currentLocation: Coordinates | null | undefined,
  radiusMeters: number,
): [number, number, number, number] {
  const latitudeRadius =
    Math.max(radiusMeters, 250) / METERS_PER_LATITUDE_DEGREE;
  const longitudeRadius =
    latitudeRadius /
    Math.max(
      0.01,
      Math.cos((destination.latitude * Math.PI) / 180),
    );
  const latitudes = [
    destination.latitude - latitudeRadius,
    destination.latitude + latitudeRadius,
  ];
  const longitudes = [
    destination.longitude - longitudeRadius,
    destination.longitude + longitudeRadius,
  ];

  if (currentLocation) {
    latitudes.push(currentLocation.latitude);
    longitudes.push(currentLocation.longitude);
  }

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

export function TripMap({
  destination,
  currentLocation,
  radiusMeters,
  height = 220,
  onPress,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const radiusFeature = useMemo(
    () => createRadiusFeature(destination, radiusMeters),
    [destination, radiusMeters],
  );
  const bounds = useMemo(
    () =>
      createMapBounds(
        destination,
        currentLocation,
        radiusMeters,
      ),
    [currentLocation, destination, radiusMeters],
  );

  return (
    <View style={[styles.mapShell, { height }]}>
      <MapLibreMap
        androidView="texture"
        attribution
        attributionPosition={{ bottom: 5, right: 5 }}
        compass={false}
        logo={false}
        mapStyle={
          isDark ? OPEN_FREE_MAP_DARK : OPEN_FREE_MAP_LIGHT
        }
        scaleBar={false}
        style={styles.map}
        touchPitch={false}
        touchRotate={false}
      >
        <Camera
          bounds={bounds}
          duration={500}
          easing="ease"
          padding={{ top: 38, right: 38, bottom: 38, left: 38 }}
        />

        <GeoJSONSource id="arrival-radius" data={radiusFeature}>
          <Layer
            id="arrival-radius-fill"
            type="fill"
            paint={{
              'fill-color': colors.orange,
              'fill-opacity': 0.18,
            }}
          />
          <Layer
            id="arrival-radius-outline"
            type="line"
            paint={{
              'line-color': colors.orange,
              'line-opacity': 0.95,
              'line-width': 2,
            }}
          />
        </GeoJSONSource>

        <Marker
          id="destination-marker"
          anchor="bottom"
          lngLat={[destination.longitude, destination.latitude]}
        >
          <View style={styles.destinationMarker}>
            <View style={styles.destinationMarkerCore} />
          </View>
        </Marker>

        {currentLocation ? (
          <Marker
            id="current-location-marker"
            lngLat={[
              currentLocation.longitude,
              currentLocation.latitude,
            ]}
          >
            <View style={styles.currentMarker}>
              <View style={styles.currentMarkerCore} />
            </View>
          </Marker>
        ) : null}
      </MapLibreMap>

      {onPress ? (
        <Pressable
          accessibilityHint="Opens an interactive full-screen map"
          accessibilityLabel="Expand destination map"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.mapPressTarget,
            pressed && styles.mapPressed,
          ]}
          onPress={onPress}
        />
      ) : null}

      <View pointerEvents="none" style={styles.mapLabel}>
        <Text style={styles.mapLabelText} numberOfLines={1}>
          {destination.name}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    mapShell: {
      width: '100%',
      overflow: 'hidden',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.gray,
    },
    map: {
      flex: 1,
    },
    mapPressTarget: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 1,
    },
    mapPressed: {
      backgroundColor: 'rgba(0,0,0,0.06)',
    },
    destinationMarker: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderBottomLeftRadius: 3,
      backgroundColor: colors.orange,
      borderWidth: 3,
      borderColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-45deg' }],
    },
    destinationMarkerCore: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.ink,
    },
    currentMarker: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 3,
      borderColor: colors.white,
      backgroundColor: colors.tealDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentMarkerCore: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.white,
    },
    mapLabel: {
      position: 'absolute',
      zIndex: 2,
      top: 10,
      left: 10,
      maxWidth: '72%',
      borderRadius: 10,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 7,
      shadowColor: colors.black,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    mapLabelText: {
      color: colors.ink,
      fontSize: 11,
      fontWeight: '800',
    },
  });
}
