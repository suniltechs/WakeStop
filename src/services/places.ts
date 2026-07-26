import type {
  Coordinates,
  Destination,
  PlaceSuggestion,
} from '../types';

const AUTOCOMPLETE_URL =
  'https://places.googleapis.com/v1/places:autocomplete';
const PLACES_URL = 'https://places.googleapis.com/v1/places';

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
  error?: { message?: string };
};

type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: Coordinates;
  error?: { message?: string };
};

export class PlacesConfigurationError extends Error {}

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim();
  if (!key) {
    throw new PlacesConfigurationError(
      'Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to .env to enable destination search.',
    );
  }
  return key;
}

async function parseResponse<T extends { error?: { message?: string } }>(
  response: Response,
): Promise<T> {
  const payload = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `Google Places request failed (${response.status}).`,
    );
  }
  return payload;
}

export async function autocompletePlaces(
  input: string,
  sessionToken: string,
  origin?: Coordinates,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const normalizedInput = input.trim();
  if (normalizedInput.length < 3) return [];

  const response = await fetch(AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat',
    },
    body: JSON.stringify({
      input: normalizedInput,
      sessionToken,
      ...(origin
        ? {
            origin,
            locationBias: {
              circle: {
                center: origin,
                radius: 50_000,
              },
            },
          }
        : {}),
    }),
    signal,
  });

  const payload = await parseResponse<AutocompleteResponse>(response);
  return (payload.suggestions ?? []).flatMap(({ placePrediction }) => {
    if (!placePrediction?.placeId) return [];
    const fullText = placePrediction.text?.text ?? 'Unknown place';
    return [
      {
        placeId: placePrediction.placeId,
        primaryText:
          placePrediction.structuredFormat?.mainText?.text ?? fullText,
        secondaryText:
          placePrediction.structuredFormat?.secondaryText?.text ?? '',
        fullText,
      },
    ];
  });
}

export async function getPlaceDestination(
  suggestion: PlaceSuggestion,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<Destination> {
  const url = `${PLACES_URL}/${encodeURIComponent(
    suggestion.placeId,
  )}?sessionToken=${encodeURIComponent(sessionToken)}`;

  const response = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
    },
    signal,
  });

  const place = await parseResponse<PlaceDetailsResponse>(response);
  if (!place.location) {
    throw new Error('Google Places did not return coordinates for this destination.');
  }

  return {
    placeId: place.id ?? suggestion.placeId,
    name: place.displayName?.text ?? suggestion.primaryText,
    address: place.formattedAddress ?? suggestion.fullText,
    ...place.location,
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
