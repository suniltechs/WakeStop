# WakeStop Public-Use Feature Roadmap

This roadmap describes the features recommended before and after releasing
WakeStop for public, everyday use. It builds on the existing application,
which already includes destination search, map-based destination selection,
saved stops, background tracking, alarm profiles, pre-alarms, snooze, themes,
and a Reliability Center.

The main product goal is simple: WakeStop should be quick to arm, dependable
with the screen locked, understandable when something is wrong, and respectful
of the user's location privacy.

## Recommended implementation order

1. Smarter and safer alarm triggering
2. Public-ready onboarding and privacy
3. Recent trips and improved saved stops
4. Import destinations shared from other apps
5. Scheduled commute reminders
6. Route-aware alarms and ETA
7. Multiple stops and transfer mode
8. Accessibility and localization
9. Battery-friendly tracking
10. Backup and data portability

## Priority 1: Smarter and safer alarm triggering

Improve arrival detection before adding more convenience features. Public users
must be able to understand whether the alarm is receiving reliable location
information and trust that one inaccurate GPS reading will not cause an early
or late alarm.

### GPS quality

- Store the accuracy value supplied with every location reading.
- Reject or de-prioritize readings whose accuracy is too poor for the selected
  alarm radius.
- Display the current GPS accuracy during an active trip.
- Warn when the last reliable location update is stale.
- Suggest a larger radius when GPS conditions are poor.
- Explain that tunnels, underground transit, tall buildings, and restricted
  phone settings can reduce accuracy.

### Trigger confirmation

- Require two or three reliable readings inside the radius before triggering.
- Optionally use a short dwell period for walking and slow travel.
- Detect whether the user is approaching or moving away from the destination.
- Add hysteresis so GPS movement around the radius boundary does not repeatedly
  change the alarm state.
- Consider the user's speed when deciding how early to trigger.
- Record the reading that triggered the alarm in local diagnostic data.

### Backup detection

- Register a geofence as a secondary arrival signal.
- Keep active-trip location tracking as the primary signal.
- Remove the geofence immediately when the trip ends.
- Never promise that geofences will trigger at an exact time.

### Acceptance criteria

- A single low-quality location reading cannot trigger the alarm.
- The active-trip screen displays accuracy and the age of the latest update.
- The user receives a visible warning if reliable updates stop.
- The alarm remains active until the user dismisses or snoozes it.

## Priority 2: Public-ready onboarding and privacy

Create a first-run experience that explains the product and requests sensitive
permissions only when they are needed.

### Onboarding

- Explain WakeStop's purpose in one short introduction.
- Let the user select a destination before requesting background location.
- Explain why foreground location, background location, notifications, sound,
  and battery settings are needed.
- Show the background-location disclosure immediately before the system
  permission request.
- Encourage the user to run a screen-off alarm test.
- Provide a way to revisit onboarding and permission explanations.

### Privacy controls

- Add an in-app privacy policy.
- Clearly state that saved stops and trip history remain on the device by
  default.
- State which third-party search, map, and routing providers receive requests.
- Explain when tracking starts and when it stops.
- Provide controls to delete individual records or all local data.
- Do not use location for advertising.
- Make diagnostic or analytics collection opt-in if it is introduced later.

### Store-release preparation

- Prepare the Google Play background-location permission declaration.
- Create a short demonstration of the background alarm flow.
- Complete the store Data Safety information accurately.
- Verify Android foreground-service declarations.
- Add public support and privacy-policy links.
- Avoid describing WakeStop as guaranteed or suitable for emergencies.

### Acceptance criteria

- No background-location permission is requested without a prior explanation.
- Users can identify when tracking is active.
- Users can delete all locally stored personal data.
- The privacy policy matches the application's real behavior.

## Priority 3: Recent trips and improved saved stops

Make repeated daily use faster and reduce the need to enter the same
destination again.

### Features

- Show recent destinations separately from saved favorites.
- Provide optional Home and Work shortcuts.
- Rename, edit, reorder, duplicate, and delete saved stops.
- Let users change a saved stop's radius and alarm profile.
- Prevent accidental duplicate saved stops.
- Display the last-used time for frequently used destinations.
- Store a simple local outcome for completed trips: triggered, dismissed,
  stopped early, or failed because tracking was unavailable.
- Allow individual history entries or all history to be cleared.
- Keep detailed location traces disabled by default.

### Acceptance criteria

- A frequent trip can be armed with one or two taps.
- Editing a saved stop does not require recreating it.
- Clearing history does not delete saved favorites unless requested.

## Priority 4: Import destinations from other apps

Allow users to send a place directly to WakeStop instead of searching for it a
second time.

### Supported inputs

- Google Maps links
- Apple Maps links
- OpenStreetMap links
- WhatsApp or other shared-location links
- Plain latitude and longitude text
- WakeStop deep links

### Features

- Add WakeStop to the operating system's share sheet where supported.
- Parse coordinates from supported URLs safely.
- Resolve shortened links only when a network connection is available.
- Preview the imported destination before saving or arming it.
- Reject malformed coordinates and unsupported URLs with a helpful message.
- Fall back to manual map selection when a link cannot be interpreted.

### Acceptance criteria

- A shared map location opens a confirmation screen in WakeStop.
- Importing never starts background tracking without user confirmation.
- Invalid links do not crash the application.

## Priority 5: Scheduled commute reminders

Help users remember to arm common trips without running GPS unnecessarily.

### Features

- Schedule a saved stop for a date and time.
- Support weekdays, weekends, and custom repeat days.
- Send a notification asking the user to arm the trip near departure time.
- Show the next scheduled reminder.
- Allow Skip today, Pause schedule, and Resume schedule actions.
- Handle timezone and daylight-saving changes.
- Open the trip confirmation screen from the reminder.
- Do not automatically begin background tracking without clear user action.

### Acceptance criteria

- A schedule can be paused without deleting it.
- The user confirms the destination and settings before tracking begins.
- Missed reminders do not silently start a trip later.

## Priority 6: Route-aware alarms and ETA

Use route information when available while preserving the existing
coordinate-based alarm as an offline fallback.

### Features

- Add walking, cycling, driving, bus, and train travel modes.
- Draw the selected route on the active-trip map.
- Display remaining route distance and estimated arrival time.
- Detect when the user has moved far away from the expected route.
- Refresh the route only when necessary to limit battery and API usage.
- Use speed and route progress to recommend an alarm radius.
- Fall back to straight-line distance if routing is offline or unavailable.

### Acceptance criteria

- Route-service failure cannot prevent a coordinate-based alarm.
- The interface clearly labels route distance versus direct distance.
- API credentials and usage limits are configured safely.

## Priority 7: Multiple stops and transfer mode

Support journeys containing transfers without allowing later stops to trigger
prematurely.

### Features

- Add multiple ordered destinations to a journey.
- Give each stop its own radius and alarm profile.
- Mark stops as active, completed, skipped, or upcoming.
- Arm only the current stop.
- Prompt the user before advancing to the next stop when appropriate.
- Save a multi-stop journey as a reusable favorite.

### Acceptance criteria

- Only one stop can be the active alarm target at a time.
- Users can skip a stop without ending the entire journey.
- Later stops do not trigger while an earlier stop is active.

## Priority 8: Accessibility and localization

Make the application usable in crowded vehicles, low-light situations, and by
people with different visual, motor, hearing, and language needs.

### Accessibility

- Add complete screen-reader labels, hints, roles, and state announcements.
- Support large system font sizes without clipping or overlapping controls.
- Provide non-color indicators for Ready, Warning, and Error states.
- Respect high-contrast and reduced-motion preferences.
- Keep primary alarm controls large and separated.
- Test the complete setup and alarm flow with Android TalkBack and iOS
  VoiceOver.
- Provide visual and vibration alternatives for important sounds.

### Localization

- Move user-facing text into localization resources.
- Support regional distance units and number formats.
- Add Hindi and other languages based on target users.
- Use the selected language for spoken destination announcements when the
  device supports it.
- Test layouts with longer translated text.

### Acceptance criteria

- The core trip flow works with a screen reader.
- The interface remains usable at the largest supported text size.
- Important states are not communicated by color alone.

## Priority 9: Battery-friendly tracking

Reduce battery use without risking late alarms.

### Features

- Use lower-power tracking while far from the destination.
- Increase update accuracy and frequency as the destination approaches.
- Consider travel speed when selecting update intervals.
- Show whether background tracking is healthy.
- Warn if the foreground service or required permission stops.
- Provide manufacturer-specific battery-optimization guidance.
- Show a simple battery-impact description before starting long trips.
- Stop all tracking, geofences, timers, audio, and progress notifications when
  the trip ends.

### Acceptance criteria

- Long trips do not use high-frequency GPS for their entire duration.
- Stopping or dismissing a trip stops all associated background work.
- Users are warned when phone settings are likely to prevent reliable alarms.

## Priority 10: Backup and data portability

Allow users to retain their setup without requiring an account.

### Features

- Export saved stops, alarm profiles, schedules, and preferences.
- Import a WakeStop backup after validating its structure and values.
- Exclude detailed location traces from exports by default.
- Offer an encrypted backup option for files containing sensitive places.
- Clearly preview what will be imported or replaced.
- Consider optional cloud synchronization only after the local workflow is
  reliable and privacy controls are complete.

### Acceptance criteria

- Exported data can be restored on another device.
- Invalid backup files cannot corrupt existing data.
- Importing data requires user confirmation before overwriting anything.

## Later enhancements

These features may improve convenience after the core public experience is
stable:

- Android and iOS home-screen widgets
- App shortcuts for Home, Work, recent trips, and favorite stops
- Wear OS and smartwatch notifications
- Arrival and leaving-location reminder modes
- Reminders such as "buy medicine when near the pharmacy"
- Optional trusted-contact arrival check-ins
- An exportable reliability and diagnostic report
- Opt-in anonymous crash reporting

## Features to avoid initially

The following features add privacy, moderation, infrastructure, or operational
complexity without strengthening WakeStop's main promise. They should be
postponed until the alarm experience is proven reliable at public scale.

- Mandatory user accounts
- Advertising based on location
- Public or continuous live-location sharing
- Social feeds or public profiles
- Detailed route recording enabled by default
- Multiple simultaneous background trips
- Claims that alarms are guaranteed or appropriate for emergencies

## Product principles

- Reliability comes before convenience.
- Starting background tracking must be an informed user action.
- Core coordinate-based alarms should remain usable without an account.
- Saved places and history should remain local by default.
- Online search, maps, routing, and ETA should enhance the experience rather
  than become requirements for the core alarm.
- The interface should clearly communicate degraded GPS, notification, or
  background-service conditions.
- WakeStop should never promise to bypass operating-system restrictions, silent
  modes, focus settings, force-stops, or manufacturer battery controls.

## Suggested delivery phases

### Public beta

- Smarter GPS validation and trigger confirmation
- First-run onboarding and privacy controls
- Store-policy preparation
- Recent trips and editable saved stops
- Accessibility fixes for the core flow
- Expanded real-device and screen-off testing

### Version 1 public release

- Shared destination imports
- Scheduled commute reminders
- Adaptive battery behavior
- Local diagnostic reporting
- Localization foundation and initial supported languages

### Later releases

- Route-aware distance and ETA
- Multiple stops and transfer journeys
- Backup and import
- Widgets, shortcuts, and smartwatch support
- Additional location-reminder modes
