import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  Marker,
  type PressEvent,
  ViewAnnotation,
  type ViewAnnotationEvent,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Modal,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  destinationFromCoordinates,
  isGeoapifyConfigured,
  reverseGeocodeCoordinates,
} from '../services/geoapify';
import type { AppColors } from '../theme';
import { useAppTheme } from '../themeContext';
import type {
  Coordinates,
  Destination,
} from '../types';
import { formatDistance } from '../utils/distance';
import { RadiusSelector } from './RadiusSelector';
import {
  createRadiusFeature,
  OPEN_FREE_MAP_DARK,
  OPEN_FREE_MAP_LIGHT,
} from './TripMap';

const DEFAULT_MAP_CENTER: Coordinates = {
  latitude: 20.5937,
  longitude: 78.9629,
};

type Props = {
  destination: Destination | null;
  origin?: Coordinates;
  radiusMeters: number;
  visible: boolean;
  onCancel: () => void;
  onConfirm: (
    destination: Destination,
    radiusMeters: number,
  ) => void;
};

function copyDestination(
  destination: Destination | null,
): Destination | null {
  return destination ? { ...destination } : null;
}

function sameCoordinates(
  destination: Destination,
  latitude: number,
  longitude: number,
): boolean {
  return (
    Math.abs(destination.latitude - latitude) < 0.0000001 &&
    Math.abs(destination.longitude - longitude) < 0.0000001
  );
}

export function DestinationMapPicker({
  destination,
  origin,
  radiusMeters,
  visible,
  onCancel,
  onConfirm,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cameraRef = useRef<CameraRef>(null);
  const initialDestinationRef = useRef<Destination | null>(null);
  const initialRadiusRef = useRef(radiusMeters);
  const initialCenterRef = useRef<Coordinates>(
    origin ?? destination ?? DEFAULT_MAP_CENTER,
  );
  const [initialCenter, setInitialCenter] = useState<Coordinates>(
    origin ?? destination ?? DEFAULT_MAP_CENTER,
  );
  const [selection, setSelection] = useState<Destination | null>(
    copyDestination(destination),
  );
  const [draftRadius, setDraftRadius] = useState(radiusMeters);
  const [currentLocation, setCurrentLocation] =
    useState<Coordinates | null>(origin ?? null);
  const [locating, setLocating] = useState(false);
  const [resolvingName, setResolvingName] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const moveCamera = useCallback(
    (coordinates: Coordinates, zoom = 15) => {
      cameraRef.current?.easeTo({
        center: [coordinates.longitude, coordinates.latitude],
        zoom,
        duration: 500,
      });
    },
    [],
  );

  const readAndCenterCurrentLocation = useCallback(async () => {
    setLocating(true);
    setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setMessage(
          'Location permission is unavailable. Pan the map and tap anywhere to choose a destination.',
        );
        return;
      }

      if (!(await Location.hasServicesEnabledAsync())) {
        setMessage(
          'Turn on Location Services, or pan and tap the map manually.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCurrentLocation(coordinates);
      moveCamera(coordinates);
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : 'Could not read the current GPS location.',
      );
    } finally {
      setLocating(false);
    }
  }, [moveCamera]);

  useEffect(() => {
    if (!visible) return;

    const originalDestination = copyDestination(destination);
    const fallbackCenter =
      origin ?? originalDestination ?? DEFAULT_MAP_CENTER;
    initialDestinationRef.current = originalDestination;
    initialRadiusRef.current = radiusMeters;
    initialCenterRef.current = fallbackCenter;
    setInitialCenter(fallbackCenter);
    setSelection(originalDestination);
    setDraftRadius(radiusMeters);
    setCurrentLocation(origin ?? null);
    setMessage(null);
    setResolvingName(false);

    const cameraTimer = setTimeout(() => {
      moveCamera(fallbackCenter, originalDestination ? 15 : 13);
      void readAndCenterCurrentLocation();
    }, 250);

    return () => clearTimeout(cameraTimer);
  }, [visible]);

  useEffect(() => {
    if (!visible || !selection) {
      setResolvingName(false);
      return;
    }

    const latitude = selection.latitude;
    const longitude = selection.longitude;
    const controller = new AbortController();
    const configured = isGeoapifyConfigured();
    setResolvingName(configured);

    const timer = setTimeout(() => {
      void reverseGeocodeCoordinates(
        latitude,
        longitude,
        controller.signal,
      )
        .then((resolvedDestination) => {
          setSelection((current) =>
            current &&
            sameCoordinates(current, latitude, longitude)
              ? resolvedDestination
              : current,
          );
        })
        .catch((caught: unknown) => {
          if (caught instanceof Error && caught.name === 'AbortError') return;
        })
        .finally(() => {
          if (!controller.signal.aborted) setResolvingName(false);
        });
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selection?.latitude, selection?.longitude, visible]);

  const selectCoordinates = useCallback(
    (latitude: number, longitude: number) => {
      setSelection(destinationFromCoordinates(latitude, longitude));
      setMessage(null);
    },
    [],
  );

  const handleMapPress = (
    event: NativeSyntheticEvent<PressEvent>,
  ) => {
    const [longitude, latitude] = event.nativeEvent.lngLat;
    selectCoordinates(latitude, longitude);
  };

  const handleMarkerDragEnd = (
    event: NativeSyntheticEvent<ViewAnnotationEvent>,
  ) => {
    const [longitude, latitude] = event.nativeEvent.lngLat;
    selectCoordinates(latitude, longitude);
  };

  const resetPicker = () => {
    const originalDestination = copyDestination(
      initialDestinationRef.current,
    );
    setSelection(originalDestination);
    setDraftRadius(initialRadiusRef.current);
    setMessage(null);
    moveCamera(
      originalDestination ??
        currentLocation ??
        initialCenterRef.current,
      originalDestination ? 15 : 13,
    );
  };

  const radiusFeature = useMemo(
    () =>
      selection
        ? createRadiusFeature(selection, draftRadius)
        : null,
    [draftRadius, selection],
  );

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCancel}
      presentationStyle="fullScreen"
      visible
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Cancel map selection"
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
            onPress={onCancel}
          >
            <Text style={styles.headerButtonText}>×</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>DESTINATION PICKER</Text>
            <Text style={styles.title}>Choose on map</Text>
          </View>
          <Pressable
            accessibilityLabel="Reset map selection"
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.pressed,
            ]}
            onPress={resetPicker}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.mapArea}>
          <MapLibreMap
            androidView="texture"
            attribution
            attributionPosition={{ bottom: 6, right: 6 }}
            compass
            logo={false}
            mapStyle={
              isDark ? OPEN_FREE_MAP_DARK : OPEN_FREE_MAP_LIGHT
            }
            scaleBar={false}
            style={styles.map}
            touchPitch={false}
            touchRotate={false}
            onPress={handleMapPress}
          >
            <Camera
              ref={cameraRef}
              initialViewState={{
                center: [
                  initialCenter.longitude,
                  initialCenter.latitude,
                ],
                zoom: destination ? 15 : 13,
              }}
            />

            {radiusFeature ? (
              <GeoJSONSource
                id="picker-arrival-radius"
                data={radiusFeature}
              >
                <Layer
                  id="picker-arrival-radius-fill"
                  type="fill"
                  paint={{
                    'fill-color': colors.orange,
                    'fill-opacity': 0.2,
                  }}
                />
                <Layer
                  id="picker-arrival-radius-outline"
                  type="line"
                  paint={{
                    'line-color': colors.orange,
                    'line-opacity': 1,
                    'line-width': 2.5,
                  }}
                />
              </GeoJSONSource>
            ) : null}

            {selection ? (
              <ViewAnnotation
                anchor="bottom"
                draggable
                id="picker-destination-marker"
                lngLat={[
                  selection.longitude,
                  selection.latitude,
                ]}
                onDragEnd={handleMarkerDragEnd}
              >
                <View style={styles.destinationMarker}>
                  <View style={styles.destinationMarkerCore} />
                </View>
              </ViewAnnotation>
            ) : null}

            {currentLocation ? (
              <Marker
                id="picker-current-location"
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

          <View style={styles.mapHint} pointerEvents="none">
            <Text style={styles.mapHintText}>
              {selection
                ? 'Tap elsewhere or drag the pin to fine-tune'
                : 'Tap the map to place your destination pin'}
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Center map on current location"
            accessibilityRole="button"
            disabled={locating}
            style={({ pressed }) => [
              styles.locationButton,
              pressed && styles.pressed,
              locating && styles.controlDisabled,
            ]}
            onPress={() => void readAndCenterCurrentLocation()}
          >
            {locating ? (
              <ActivityIndicator color={colors.orange} size="small" />
            ) : (
              <Text style={styles.locationButtonIcon}>⌖</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.panel}>
          <View style={styles.selectionHeader}>
            <View style={styles.selectionCopy}>
              <Text
                numberOfLines={1}
                style={styles.selectionName}
              >
                {selection
                  ? selection.name
                  : 'No destination selected'}
              </Text>
              <Text
                numberOfLines={1}
                style={styles.selectionAddress}
              >
                {selection
                  ? selection.address
                  : 'Tap anywhere on the map to begin.'}
              </Text>
            </View>
            {resolvingName ? (
              <ActivityIndicator color={colors.orange} size="small" />
            ) : null}
          </View>

          {selection ? (
            <View style={styles.coordinateRow}>
              <View style={styles.coordinateCard}>
                <Text style={styles.coordinateLabel}>LATITUDE</Text>
                <Text style={styles.coordinateValue}>
                  {selection.latitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.coordinateCard}>
                <Text style={styles.coordinateLabel}>LONGITUDE</Text>
                <Text style={styles.coordinateValue}>
                  {selection.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.radiusHeader}>
            <Text style={styles.radiusTitle}>Alarm radius</Text>
            <Text style={styles.radiusValue}>
              {formatDistance(draftRadius)}
            </Text>
          </View>
          <RadiusSelector
            value={draftRadius}
            onChange={setDraftRadius}
          />

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!selection}
              style={({ pressed }) => [
                styles.confirmButton,
                !selection && styles.confirmButtonDisabled,
                pressed && selection && styles.pressed,
              ]}
              onPress={() => {
                if (selection) onConfirm(selection, draftRadius);
              }}
            >
              <Text
                style={[
                  styles.confirmButtonText,
                  !selection && styles.confirmButtonTextDisabled,
                ]}
              >
                Confirm destination
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      minHeight: 66,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      zIndex: 2,
    },
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.gray,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButtonText: {
      color: colors.ink,
      fontSize: 28,
      lineHeight: 30,
    },
    headerCopy: {
      flex: 1,
      paddingHorizontal: 12,
    },
    eyebrow: {
      color: colors.orange,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    title: {
      color: colors.ink,
      fontSize: 20,
      fontWeight: '900',
      marginTop: 1,
    },
    resetButton: {
      minHeight: 40,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 13,
    },
    resetButtonText: {
      color: colors.ink,
      fontSize: 12,
      fontWeight: '800',
    },
    mapArea: {
      flex: 1,
      minHeight: 250,
      backgroundColor: colors.gray,
    },
    map: {
      flex: 1,
    },
    mapHint: {
      borderRadius: 12,
      backgroundColor: colors.teal,
      paddingHorizontal: 12,
      paddingVertical: 8,
      position: 'absolute',
      top: 12,
      left: 12,
      right: 66,
    },
    mapHintText: {
      color: colors.white,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    locationButton: {
      width: 46,
      height: 46,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      top: 12,
      right: 12,
      elevation: 4,
      shadowColor: colors.black,
      shadowOpacity: 0.16,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 3 },
    },
    locationButtonIcon: {
      color: colors.orange,
      fontSize: 24,
      fontWeight: '900',
    },
    controlDisabled: {
      opacity: 0.65,
    },
    destinationMarker: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderBottomLeftRadius: 4,
      backgroundColor: colors.orange,
      borderWidth: 3,
      borderColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-45deg' }],
    },
    destinationMarkerCore: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.black,
    },
    currentMarker: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 3,
      borderColor: colors.white,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentMarkerCore: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.orange,
    },
    panel: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: colors.background,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 12,
      marginTop: -18,
      zIndex: 2,
      elevation: 8,
      shadowColor: colors.black,
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -4 },
    },
    selectionHeader: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectionCopy: {
      flex: 1,
      paddingRight: 10,
    },
    selectionName: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    selectionAddress: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 3,
    },
    coordinateRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    coordinateCard: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: colors.gray,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    coordinateLabel: {
      color: colors.muted,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
    },
    coordinateValue: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '800',
      marginTop: 2,
    },
    radiusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 13,
      marginBottom: 9,
    },
    radiusTitle: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    radiusValue: {
      color: colors.orangeDark,
      fontSize: 12,
      fontWeight: '900',
      marginLeft: 'auto',
    },
    message: {
      color: colors.danger,
      fontSize: 10,
      lineHeight: 14,
      marginTop: 8,
    },
    actions: {
      flexDirection: 'row',
      gap: 9,
      marginTop: 14,
    },
    cancelButton: {
      minWidth: 92,
      minHeight: 50,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 15,
    },
    cancelButtonText: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '800',
    },
    confirmButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 16,
      backgroundColor: colors.orange,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 15,
    },
    confirmButtonDisabled: {
      backgroundColor: colors.gray,
    },
    confirmButtonText: {
      color: colors.black,
      fontSize: 13,
      fontWeight: '900',
    },
    confirmButtonTextDisabled: {
      color: colors.muted,
    },
    pressed: {
      opacity: 0.75,
      transform: [{ scale: 0.99 }],
    },
  });
}
