import type {
  Coordinates,
  Destination,
  PlaceSuggestion,
} from '../types';

const AUTOCOMPLETE_URL =
  'https://api.geoapify.com/v1/geocode/autocomplete';
const REVERSE_GEOCODE_URL =
  'https://api.geoapify.com/v1/geocode/reverse';

type GeoapifyResult = {
  place_id?: string;
  lat?: number;
  lon?: number;
  name?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
};

type GeoapifyError = {
  message?: string;
  error?: string;
};

type GeoapifyResponse = GeoapifyError & {
  results?: GeoapifyResult[];
};

export class GeoapifyConfigurationError extends Error {}

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY?.trim();
  if (!key) {
    throw new GeoapifyConfigurationError(
      'Add EXPO_PUBLIC_GEOAPIFY_API_KEY to .env to enable destination search.',
    );
  }
  return key;
}

export function isGeoapifyConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY?.trim());
}

export function buildGeoapifyAutocompleteUrl(
  input: string,
  apiKey: string,
  origin?: Coordinates,
): string {
  const params = new URLSearchParams({
    text: input.trim(),
    format: 'json',
    limit: '6',
    lang: 'en',
    apiKey,
  });

  if (origin) {
    params.set(
      'bias',
      `proximity:${origin.longitude},${origin.latitude}`,
    );
  }

  return `${AUTOCOMPLETE_URL}?${params.toString()}`;
}

export function buildGeoapifyReverseGeocodeUrl(
  latitude: number,
  longitude: number,
  apiKey: string,
): string {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
    lang: 'en',
    limit: '1',
    apiKey,
  });

  return `${REVERSE_GEOCODE_URL}?${params.toString()}`;
}

export function mapGeoapifyResults(
  results: GeoapifyResult[],
): PlaceSuggestion[] {
  return results.flatMap((result) => {
    if (
      !Number.isFinite(result.lat) ||
      !Number.isFinite(result.lon) ||
      typeof result.lat !== 'number' ||
      typeof result.lon !== 'number'
    ) {
      return [];
    }

    const fullText =
      result.formatted ??
      [result.address_line1, result.address_line2]
        .filter(Boolean)
        .join(', ');
    const primaryText =
      result.name ??
      result.address_line1 ??
      fullText ??
      'Selected destination';
    const secondaryText =
      result.address_line2 ??
      (fullText && fullText !== primaryText ? fullText : '');

    return [
      {
        placeId:
          result.place_id ??
          `geoapify:${result.lat.toFixed(6)},${result.lon.toFixed(6)}`,
        primaryText,
        secondaryText,
        fullText: fullText || primaryText,
        latitude: result.lat,
        longitude: result.lon,
      },
    ];
  });
}

export function mapGeoapifyResponse(
  payload: unknown,
): PlaceSuggestion[] {
  const results = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === 'object' &&
        'results' in payload &&
        Array.isArray(payload.results)
      ? payload.results
      : null;

  if (!results) {
    throw new Error('Geoapify returned an unexpected search response.');
  }

  return mapGeoapifyResults(results as GeoapifyResult[]);
}

export async function autocompletePlaces(
  input: string,
  origin?: Coordinates,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const normalizedInput = input.trim();
  if (normalizedInput.length < 3) return [];

  const response = await fetch(
    buildGeoapifyAutocompleteUrl(
      normalizedInput,
      getApiKey(),
      origin,
    ),
    {
      headers: { Accept: 'application/json' },
      signal,
    },
  );

  const payload = (await response.json()) as
    | GeoapifyResult[]
    | GeoapifyResponse;

  if (!response.ok) {
    const error = Array.isArray(payload) ? null : payload;
    throw new Error(
      error?.message ??
        error?.error ??
        `Geoapify search failed (${response.status}).`,
    );
  }

  return mapGeoapifyResponse(payload);
}

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<Destination> {
  const fallback = destinationFromCoordinates(latitude, longitude);
  if (!isGeoapifyConfigured()) return fallback;

  try {
    const response = await fetch(
      buildGeoapifyReverseGeocodeUrl(
        latitude,
        longitude,
        getApiKey(),
      ),
      {
        headers: { Accept: 'application/json' },
        signal,
      },
    );

    if (!response.ok) return fallback;

    const suggestions = mapGeoapifyResponse(await response.json());
    const firstSuggestion = suggestions[0];
    return firstSuggestion
      ? getPlaceDestination(firstSuggestion)
      : fallback;
  } catch (caught) {
    if (caught instanceof Error && caught.name === 'AbortError') throw caught;
    return fallback;
  }
}

export function getPlaceDestination(
  suggestion: PlaceSuggestion,
): Destination {
  return {
    placeId: suggestion.placeId,
    name: suggestion.primaryText,
    address: suggestion.fullText,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  };
}

export function destinationFromCoordinates(
  latitude: number,
  longitude: number,
): Destination {
  const label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  return {
    placeId: `coordinates:${label}`,
    name: 'Pinned coordinates',
    address: label,
    latitude,
    longitude,
  };
}
