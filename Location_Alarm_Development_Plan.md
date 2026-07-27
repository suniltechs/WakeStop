@# Location Alarm — Development Plan

**Purpose:** A personal-use mobile app that tracks location in the background during a bus commute and triggers a loud alarm + vibration + notification when the user is within a set distance of their destination, so they don't miss their stop while asleep.

**Stack:** Expo (React Native), MapLibre + OpenFreeMap, Geoapify autocomplete (free tier), `expo-task-manager` + `expo-location` for background tracking, `expo-notifications` for alerts, local storage only (no backend, no app store publishing required).

---

## Phase 0 — Setup

**Goal:** Development environment ready, app runs on your own phone.

- Install Node.js and Expo CLI.
- Create a new Expo project.
- Install `expo-dev-client` (required for background location — plain Expo Go won't support it).
- Get a free Geoapify API key for autocomplete. OpenFreeMap requires no map key.
- Build the dev client and install it on your phone via USB/Expo.

**Deliverable:** Blank app running on your actual phone (not just an emulator).

---

## Phase 1 — Core MVP (Foreground Only)

**Goal:** Validate the alarm logic while the app is open and screen is on.

- Destination input screen using Geoapify autocomplete.
- Alarm radius selector (300m / 500m / 1km / custom).
- "Start Trip" button that begins foreground location tracking (`watchPositionAsync`) with a live distance-remaining readout.
- Haversine formula to calculate straight-line distance to destination on each location update.
- When distance ≤ radius: trigger sound (`expo-av`) + vibration (`Vibration` API / `expo-haptics`) + on-screen alert.

**Deliverable:** Working alarm logic, tested manually while holding the phone with the screen on.

---

## Phase 2 — Background Tracking

**Goal:** Alarm works reliably with the screen off and app minimized — this is the core value of the app.

- Set up `expo-task-manager` with a defined background location task.
- Configure `expo-location`'s `startLocationUpdatesAsync` with background permissions (Android: "Allow all the time"; iOS: background location capability).
- Move distance-check and alarm-trigger logic into the background task callback.
- Use `expo-notifications` for a high-priority, full-screen-intent style notification (Android) or the loudest critical/standard alert (iOS) — a normal notification can be missed if you're actually asleep.
- Adaptive polling to save battery: check less frequently when far from destination, more frequently as you get close.
- Whitelist the app from battery optimization / auto-kill in your phone's settings (important on Xiaomi/Oppo/Vivo/Samsung, which aggressively kill background tasks).

**Deliverable:** Alarm reliably fires during a real bus ride with the screen off. Expect a few real test rides to tune this phase.

---

## Phase 3 — Daily-Use Polish

**Goal:** Make the app painless to use every day, not just functional.

- Save favorite routes (e.g., "Home → Office") to local storage (`AsyncStorage` or `expo-sqlite`) to skip re-entering addresses.
- One-tap "Start" from a saved route.
- Large, easy-to-hit snooze/dismiss button on the alarm screen for half-asleep use.
- Live distance-remaining shown via lock screen or persistent notification during an active trip.
- Auto-stop tracking once the alarm is dismissed, to avoid unnecessary battery drain.

**Deliverable:** An app you'd actually reach for every morning without friction.

---

## Phase 4 — Optional Refinements

**Goal:** Ongoing improvements, only if desired — none of these are required for the app to work.

- Recurring auto-schedule (auto-arm at your usual commute time on weekdays).
- Route-snapping via an open routing service such as OSRM or Valhalla instead of straight-line distance, for more accuracy on winding bus routes.
- Support for multiple simultaneous alarms (useful if your route involves a transfer).
- Simple personal stats (e.g., number of times the alarm has saved you from missing your stop).
