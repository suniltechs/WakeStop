import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGeoapifyAutocompleteUrl,
  buildGeoapifyReverseGeocodeUrl,
  destinationFromCoordinates,
  getPlaceDestination,
  mapGeoapifyResponse,
  mapGeoapifyResults,
} from '../src/services/geoapify.ts';

test('Geoapify search URL includes a proximity bias when GPS is available', () => {
  const url = new URL(
    buildGeoapifyAutocompleteUrl('Majestic Bus Stand', 'test-key', {
      latitude: 12.9767,
      longitude: 77.5713,
    }),
  );

  assert.equal(url.searchParams.get('text'), 'Majestic Bus Stand');
  assert.equal(url.searchParams.get('limit'), '6');
  assert.equal(url.searchParams.get('apiKey'), 'test-key');
  assert.equal(
    url.searchParams.get('bias'),
    'proximity:77.5713,12.9767',
  );
});

test('Geoapify reverse-geocode URL contains exact selected coordinates', () => {
  const url = new URL(
    buildGeoapifyReverseGeocodeUrl(13.0382, 80.1565, 'test-key'),
  );

  assert.equal(url.pathname, '/v1/geocode/reverse');
  assert.equal(url.searchParams.get('lat'), '13.0382');
  assert.equal(url.searchParams.get('lon'), '80.1565');
  assert.equal(url.searchParams.get('limit'), '1');
  assert.equal(url.searchParams.get('apiKey'), 'test-key');
});

test('Geoapify results become selectable WakeStop destinations', () => {
  const suggestions = mapGeoapifyResults([
    {
      place_id: 'geo-place-1',
      lat: 12.9767,
      lon: 77.5713,
      name: 'Majestic Bus Stand',
      formatted: 'Majestic Bus Stand, Bengaluru, Karnataka, India',
      address_line2: 'Bengaluru, Karnataka, India',
    },
    {
      place_id: 'invalid-without-coordinates',
      name: 'Invalid result',
    },
  ]);

  assert.equal(suggestions.length, 1);
  assert.deepEqual(getPlaceDestination(suggestions[0]), {
    placeId: 'geo-place-1',
    name: 'Majestic Bus Stand',
    address: 'Majestic Bus Stand, Bengaluru, Karnataka, India',
    latitude: 12.9767,
    longitude: 77.5713,
  });
});

test('Geoapify JSON response wrapper becomes selectable suggestions', () => {
  const suggestions = mapGeoapifyResponse({
    results: [
      {
        place_id: 'porur',
        lat: 13.0382,
        lon: 80.1565,
        name: 'Porur',
        formatted: 'Porur, Chennai, Tamil Nadu, India',
        address_line2: 'Chennai, Tamil Nadu, India',
      },
    ],
    query: { text: 'Porur' },
  });

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].primaryText, 'Porur');
  assert.equal(suggestions[0].latitude, 13.0382);
  assert.equal(suggestions[0].longitude, 80.1565);
});

test('raw coordinate destinations remain available without a place name', () => {
  assert.deepEqual(destinationFromCoordinates(13.0382, 80.1565), {
    placeId: 'coordinates:13.03820, 80.15650',
    name: 'Pinned coordinates',
    address: '13.03820, 80.15650',
    latitude: 13.0382,
    longitude: 80.1565,
  });
});
