# WakeStop

WakeStop is a personal, local-only location alarm built with Expo and React
Native. Choose a stop, lock the phone, and the app raises a loud notification,
vibrates, and opens a large dismiss/snooze screen when the device enters the
chosen radius.

## What is implemented

- Google Places (New) autocomplete and Place Details lookup
- Manual latitude/longitude fallback, so the app can work without Google keys
- 300 m, 500 m, 1 km, and custom alarm radii
- Foreground GPS updates with Haversine distance and live trip progress
- Background location task with an Android foreground service
- Distance-aware progress notification cadence (60/30/10 seconds)
- Max-importance Android alarm channel with a bundled 29-second alarm sound
- Time-sensitive iOS local notification with the same custom sound
- Looping foreground alarm audio and vibration
- Five-minute snooze and large dismiss control
- Automatic background tracking shutdown on dismiss/stop
- Saved stops in AsyncStorage with one-tap starts
- Local storage only; no account, server, analytics, or route history

The optional Phase 4 ideas from the original plan (schedules, Directions route
snapping, multiple simultaneous alarms, and stats) are intentionally not part
of this MVP.

## Requirements

- Node.js 20.19 or newer
- An Android phone with USB debugging, or an Expo/EAS account for a cloud
  development build
- Android Studio/JDK/ADB only if building locally on Windows
- A Mac with Xcode to build locally for iOS

Background location is not supported by Expo Go. Use the included development
client configuration.

## Configure Google APIs

The app remains usable with manually entered coordinates if you skip this
section.

1. Create a Google Cloud project with billing enabled.
2. Enable **Maps SDK for Android**, **Maps SDK for iOS** (if needed), and
   **Places API (New)**.
3. Create two API keys:
   - A native Maps key restricted to Android package `in.rentla.wakestop` and
     its signing SHA-1 (and/or iOS bundle `in.rentla.wakestop`).
   - A Places web-service key restricted to the Places API (New), with a small
     daily quota. Since this is a no-backend personal app, the key is bundled
     in the client and cannot use an IP restriction.
4. Copy `.env.example` to `.env` and fill both values:

```dotenv
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...
```

`EXPO_PUBLIC_` values are compiled into the app. Do not treat them as secrets.
The native Maps key and Places key have different restriction models, which is
why they are kept separate.

## Install and run

```powershell
npm.cmd install
npm.cmd run check
```

For a local Android development build:

```powershell
npm.cmd run android
```

The current Windows machine still needs a JDK, Android SDK, and `adb` before
that command can build and install the app. For a cloud build:

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest build:configure
npx.cmd eas-cli@latest build --profile development --platform android
```

After installing the resulting APK, run:

```powershell
npm.cmd run start:dev-client
```

Rebuild the native client after changing `app.config.ts`, a native dependency,
or the bundled notification sound.

## Required phone settings

When starting the first trip:

1. Allow precise location while using the app.
2. Grant background location (“Allow all the time”).
3. Allow notifications and sound.
4. On Android, keep the `Arrival alarms` notification channel at maximum
   importance.
5. Exclude WakeStop from battery optimization/auto-start restrictions on
   Xiaomi, Oppo, Vivo, OnePlus, Realme, and many Samsung devices.

Do not force-stop the app. Android cannot restart Expo background location
after a force-stop, and some vendors treat swiping an app away as a force-stop.

## Reliability boundary

This implementation uses the strongest behavior exposed by Expo Notifications:
a max-importance alarm channel on Android and a time-sensitive notification on
iOS. Android full-screen intents are restricted by modern Android versions and
are not exposed by `expo-notifications`; iOS critical alerts require an Apple
entitlement. WakeStop therefore cannot promise to bypass Do Not Disturb,
manufacturer task killers, a user force-stop, or iOS silent/focus settings.

Test the alarm while stationary first, then on several real rides. GPS accuracy,
road shape, stop spacing, and bus speed all affect the best radius; begin at
500 m and tune from there.

## Project layout

```text
App.tsx                         UI and foreground trip lifecycle
src/backgroundLocationTask.ts  top-level Expo background task
src/services/                  Places, storage, tracking, notifications
src/utils/distance.ts          Haversine and update cadence
src/components/                setup, map, radius, and alarm UI
app.config.ts                  native permissions and config plugins
```
