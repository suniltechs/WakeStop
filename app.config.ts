import type { ConfigContext, ExpoConfig } from 'expo/config';

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
    infoPlist: {
      UIBackgroundModes: ['location', 'audio'],
    },
  },
  android: {
    package: 'in.rentla.wakestop',
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['VIBRATE', 'WAKE_LOCK'],
  },
  plugins: [
    'expo-dev-client',
    '@maplibre/maplibre-react-native',
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
        color: '#FCA311',
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
  ],
  web: {
    favicon: './assets/favicon.png',
  },
});
