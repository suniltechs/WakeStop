import type { ConfigContext, ExpoConfig } from 'expo/config';

const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'WakeStop',
  slug: 'wake-stop',
  version: '1.0.0',
  scheme: 'wakestop',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'in.rentla.wakestop',
    config: mapsApiKey ? { googleMapsApiKey: mapsApiKey } : undefined,
    infoPlist: {
      UIBackgroundModes: ['location', 'audio'],
    },
  },
  android: {
    package: 'in.rentla.wakestop',
    adaptiveIcon: {
      backgroundColor: '#F7F4EC',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['VIBRATE', 'WAKE_LOCK'],
  },
  plugins: [
    'expo-dev-client',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'WakeStop uses your location to show the distance to your stop.',
        locationAlwaysAndWhenInUsePermission:
          'WakeStop needs background location to wake you before your stop when the screen is locked.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        androidForegroundServiceIcon: './assets/android-icon-monochrome.png',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#F26B38',
        defaultChannel: 'arrival-alarm',
        sounds: ['./assets/alarm.wav'],
      },
    ],
    [
      'expo-audio',
      {
        enableBackgroundPlayback: true,
        enableBackgroundRecording: false,
        recordAudioAndroid: false,
        microphonePermission: false,
      },
    ],
    ...(mapsApiKey
      ? [
          [
            'react-native-maps',
            {
              androidGoogleMapsApiKey: mapsApiKey,
              iosGoogleMapsApiKey: mapsApiKey,
            },
          ] as [string, Record<string, string>],
        ]
      : []),
  ],
  web: {
    favicon: './assets/favicon.png',
  },
});
