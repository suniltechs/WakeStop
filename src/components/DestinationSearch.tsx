import { useEffect, useMemo, useState } from 'react';
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
  PlacesConfigurationError,
} from '../services/places';
import { createId } from '../utils/id';
import { colors } from '../theme';

type Props = {
  value: Destination | null;
  origin?: Coordinates;
  onChange: (destination: Destination | null) => void;
};

export function DestinationSearch({ value, origin, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [sessionToken, setSessionToken] = useState(() => createId('places'));
  const placesConfigured = useMemo(
    () => Boolean(process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim()),
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
        sessionToken,
        origin,
        controller.signal,
      )
        .then(setSuggestions)
        .catch((caught: unknown) => {
          if (caught instanceof Error && caught.name === 'AbortError') return;
          setError(
            caught instanceof PlacesConfigurationError ||
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
  }, [manualMode, origin, query, sessionToken, value]);

  const selectSuggestion = async (suggestion: PlaceSuggestion) => {
    setLoading(true);
    setError(null);
    try {
      const destination = await getPlaceDestination(
        suggestion,
        sessionToken,
      );
      onChange(destination);
      setQuery('');
      setSuggestions([]);
      setSessionToken(createId('places'));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not load that destination.',
      );
    } finally {
      setLoading(false);
    }
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
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change destination"
          hitSlop={12}
          onPress={() => onChange(null)}
        >
          <Text style={styles.changeText}>Change</Text>
        </Pressable>
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
              placeholder={
                placesConfigured ? 'Search your stop' : 'Places key not configured'
              }
              placeholderTextColor="#929A96"
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
                  onPress={() => void selectSuggestion(suggestion)}
                >
                  <Text style={styles.resultName}>{suggestion.primaryText}</Text>
                  {suggestion.secondaryText ? (
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {suggestion.secondaryText}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
              <Text style={styles.googleAttribution}>Powered by Google</Text>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.manualCard}>
          <Text style={styles.manualTitle}>Enter coordinates</Text>
          <View style={styles.coordinateRow}>
            <TextInput
              accessibilityLabel="Destination latitude"
              keyboardType="numbers-and-punctuation"
              placeholder="Latitude"
              placeholderTextColor="#929A96"
              style={[styles.inputShell, styles.coordinateInput]}
              value={latitude}
              onChangeText={setLatitude}
            />
            <TextInput
              accessibilityLabel="Destination longitude"
              keyboardType="numbers-and-punctuation"
              placeholder="Longitude"
              placeholderTextColor="#929A96"
              style={[styles.inputShell, styles.coordinateInput]}
              value={longitude}
              onChangeText={setLongitude}
            />
          </View>
          <Pressable style={styles.coordinateButton} onPress={useCoordinates}>
            <Text style={styles.coordinateButtonText}>Use these coordinates</Text>
          </Pressable>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setManualMode((current) => !current);
          setError(null);
        }}
      >
        <Text style={styles.manualLink}>
          {manualMode ? 'Back to place search' : 'Or enter map coordinates'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.teal,
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
  googleAttribution: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'right',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectedCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BBD9D1',
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
  changeText: {
    color: colors.tealDark,
    fontSize: 13,
    fontWeight: '800',
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
  coordinateInput: {
    flex: 1,
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
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});
