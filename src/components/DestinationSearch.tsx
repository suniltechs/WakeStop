import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  Coordinates,
  Destination,
  PlaceSuggestion,
} from '../types';
import {
  autocompletePlaces,
  destinationFromCoordinates,
  getPlaceDestination,
  GeoapifyConfigurationError,
} from '../services/geoapify';
import type { AppColors } from '../theme';
import { useAppTheme } from '../themeContext';

type Props = {
  value: Destination | null;
  origin?: Coordinates;
  onChange: (destination: Destination | null) => void;
  onOpenMap: () => void;
};

export function DestinationSearch({
  value,
  origin,
  onChange,
  onOpenMap,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const geoapifyConfigured = useMemo(
    () => Boolean(process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY?.trim()),
    [],
  );

  useEffect(() => {
    if (value || manualMode || query.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      autocompletePlaces(
        query,
        origin,
        controller.signal,
      )
        .then(setSuggestions)
        .catch((caught: unknown) => {
          if (caught instanceof Error && caught.name === 'AbortError') return;
          setError(
            caught instanceof GeoapifyConfigurationError ||
              caught instanceof Error
              ? caught.message
              : 'Could not search for places.',
          );
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [manualMode, origin, query, value]);

  const selectSuggestion = (suggestion: PlaceSuggestion) => {
    setError(null);
    onChange(getPlaceDestination(suggestion));
    setQuery('');
    setSuggestions([]);
  };

  const useCoordinates = () => {
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      setError('Enter a latitude from -90 to 90 and longitude from -180 to 180.');
      return;
    }

    onChange(destinationFromCoordinates(parsedLatitude, parsedLongitude));
    setError(null);
    setManualMode(false);
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError(
          'Location permission is required to use your current GPS coordinates.',
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setError('Turn on Location Services, then try again.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const currentLatitude = position.coords.latitude;
      const currentLongitude = position.coords.longitude;
      const currentDestination = destinationFromCoordinates(
        currentLatitude,
        currentLongitude,
      );

      setLatitude(currentLatitude.toFixed(6));
      setLongitude(currentLongitude.toFixed(6));
      onChange({
        ...currentDestination,
        placeId: `current-location:${currentDestination.address}`,
        name: 'Current GPS location',
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not read your current location.',
      );
    } finally {
      setLocating(false);
    }
  };

  if (value) {
    return (
      <View style={styles.selectedCard}>
        <View style={styles.pin}>
          <Text style={styles.pinText}>◎</Text>
        </View>
        <View style={styles.selectedCopy}>
          <Text style={styles.selectedName}>{value.name}</Text>
          <Text style={styles.selectedAddress} numberOfLines={2}>
            {value.address}
          </Text>
          <View style={styles.selectedCoordinates}>
            <Text style={styles.coordinateValue}>
              LAT {value.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordinateValue}>
              LNG {value.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
        <View style={styles.selectedActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit destination on map"
            hitSlop={8}
            style={({ pressed }) => [
              styles.selectedMapButton,
              pressed && styles.locationActionPressed,
            ]}
            onPress={onOpenMap}
          >
            <Text style={styles.selectedMapButtonText}>Map</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear destination"
            hitSlop={8}
            onPress={() => onChange(null)}
          >
            <Text style={styles.changeText}>Clear</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      {!manualMode ? (
        <>
          <View style={styles.inputShell}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              accessibilityLabel="Search destination"
              autoCapitalize="words"
              autoCorrect={false}
              editable={geoapifyConfigured}
              placeholder={
                geoapifyConfigured
                  ? 'Search your stop'
                  : 'Place search unavailable'
              }
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={query}
              onChangeText={setQuery}
            />
            {loading ? <ActivityIndicator color={colors.teal} /> : null}
          </View>

          {suggestions.length > 0 ? (
            <View style={styles.results}>
              {suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion.placeId}
                  style={({ pressed }) => [
                    styles.result,
                    pressed && styles.resultPressed,
                  ]}
                  onPress={() => selectSuggestion(suggestion)}
                >
                  <Text style={styles.resultName}>{suggestion.primaryText}</Text>
                  {suggestion.secondaryText ? (
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {suggestion.secondaryText}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          {geoapifyConfigured ? (
            <Text style={styles.providerAttribution}>
              Powered by Geoapify · © OpenStreetMap contributors
            </Text>
          ) : null}

          {!geoapifyConfigured ? (
            <View style={styles.placesUnavailable}>
              <Text style={styles.placesUnavailableTitle}>
                Free place search is not configured
              </Text>
              <Text style={styles.placesUnavailableBody}>
                Add a free Geoapify key, use your current location, or enter
                destination coordinates below. The map itself needs no key.
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.manualCard}>
          <Text style={styles.manualTitle}>Enter latitude and longitude</Text>
          <View style={styles.coordinateRow}>
            <View style={styles.coordinateField}>
              <Text style={styles.coordinateLabel}>Latitude</Text>
              <TextInput
                accessibilityLabel="Destination latitude"
                keyboardType="numbers-and-punctuation"
                placeholder="e.g. 12.971599"
                placeholderTextColor={colors.muted}
                style={[styles.inputShell, styles.coordinateInput]}
                value={latitude}
                onChangeText={setLatitude}
              />
            </View>
            <View style={styles.coordinateField}>
              <Text style={styles.coordinateLabel}>Longitude</Text>
              <TextInput
                accessibilityLabel="Destination longitude"
                keyboardType="numbers-and-punctuation"
                placeholder="e.g. 77.594566"
                placeholderTextColor={colors.muted}
                style={[styles.inputShell, styles.coordinateInput]}
                value={longitude}
                onChangeText={setLongitude}
              />
            </View>
          </View>
          <Pressable style={styles.coordinateButton} onPress={useCoordinates}>
            <Text style={styles.coordinateButtonText}>Use these coordinates</Text>
          </Pressable>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {manualMode ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setManualMode(false);
            setError(null);
          }}
        >
          <Text style={styles.manualLink}>Back to destination options</Text>
        </Pressable>
      ) : (
        <>
          <Pressable
            accessibilityHint="Opens a full-screen map where you can tap or drag a destination pin"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.mapPickerAction,
              pressed && styles.locationActionPressed,
            ]}
            onPress={onOpenMap}
          >
            <View style={styles.mapPickerIcon}>
              <Text style={styles.mapPickerIconText}>⌖</Text>
            </View>
            <View style={styles.mapPickerCopy}>
              <Text style={styles.mapPickerTitle}>Choose on map</Text>
              <Text style={styles.mapPickerBody}>
                Tap a location and preview the alarm radius
              </Text>
            </View>
            <Text style={styles.mapPickerArrow}>→</Text>
          </Pressable>

          <View style={styles.locationActions}>
            <Pressable
              accessibilityRole="button"
              disabled={locating}
              style={({ pressed }) => [
                styles.locationAction,
                pressed && styles.locationActionPressed,
                locating && styles.locationActionDisabled,
              ]}
              onPress={() => void useCurrentLocation()}
            >
              {locating ? (
                <ActivityIndicator color={colors.tealDark} size="small" />
              ) : (
                <Text style={styles.locationActionIcon}>⌖</Text>
              )}
              <Text style={styles.locationActionText}>
                {locating ? 'Finding location…' : 'Use current location'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.locationAction,
                pressed && styles.locationActionPressed,
              ]}
              onPress={() => {
                setManualMode(true);
                setError(null);
              }}
            >
              <Text style={styles.locationActionIcon}>#</Text>
              <Text style={styles.locationActionText}>Enter latitude / longitude</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  inputShell: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 28,
    color: colors.orange,
    marginRight: 10,
    marginTop: -4,
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    paddingVertical: 15,
  },
  results: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  result: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultPressed: {
    backgroundColor: colors.tealSoft,
  },
  resultName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  resultAddress: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
  providerAttribution: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  placesUnavailable: {
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
    paddingLeft: 11,
    paddingRight: 6,
    marginTop: 10,
  },
  placesUnavailableTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  placesUnavailableBody: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  selectedCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.tealSoft,
    padding: 14,
  },
  pin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
  },
  pinText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 22,
  },
  selectedCopy: {
    flex: 1,
    paddingHorizontal: 12,
  },
  selectedName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  selectedAddress: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
  selectedCoordinates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 7,
  },
  coordinateValue: {
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.72)',
    color: colors.tealDark,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  changeText: {
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 7,
  },
  selectedActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMapButton: {
    minWidth: 54,
    minHeight: 34,
    borderRadius: 11,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  selectedMapButtonText: {
    color: colors.black,
    fontSize: 11,
    fontWeight: '900',
  },
  manualCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  manualTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  coordinateField: {
    flex: 1,
  },
  coordinateLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },
  coordinateInput: {
    width: '100%',
    minHeight: 50,
    paddingVertical: 10,
    color: colors.ink,
  },
  coordinateButton: {
    marginTop: 10,
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinateButtonText: {
    color: colors.white,
    fontWeight: '800',
  },
  manualLink: {
    color: colors.tealDark,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  locationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  mapPickerAction: {
    minHeight: 68,
    borderRadius: 17,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginTop: 10,
  },
  mapPickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerIconText: {
    color: colors.black,
    fontSize: 22,
    fontWeight: '900',
  },
  mapPickerCopy: {
    flex: 1,
    paddingHorizontal: 11,
  },
  mapPickerTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  mapPickerBody: {
    color: colors.white,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
    opacity: 0.72,
  },
  mapPickerArrow: {
    color: colors.orange,
    fontSize: 22,
    fontWeight: '900',
  },
  locationAction: {
    flex: 1,
    minHeight: 58,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  locationActionPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  locationActionDisabled: {
    opacity: 0.58,
  },
  locationActionIcon: {
    color: colors.tealDark,
    fontSize: 20,
    fontWeight: '900',
    marginRight: 6,
  },
  locationActionText: {
    flexShrink: 1,
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  });
}
