import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { SimpleLineIcons } from '@react-native-vector-icons/simple-line-icons/static';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { AlarmScreen } from './src/components/AlarmScreen';
import {
  type AppTab,
  BottomNavigation,
} from './src/components/BottomNavigation';
import { DestinationMapPicker } from './src/components/DestinationMapPicker';
import { DestinationSearch } from './src/components/DestinationSearch';
import { IntroScreen } from './src/components/IntroScreen';
import { RadiusSelector } from './src/components/RadiusSelector';
import { ReliabilityCenterModal } from './src/components/ReliabilityCenterModal';
import { SettingsScreen } from './src/components/SettingsScreen';
import { TripMap } from './src/components/TripMap';
import {
  BACKGROUND_LOCATION_TASK,
  DEFAULT_RADIUS_METERS,
  DISMISS_ACTION_ID,
  SNOOZE_ACTION_ID,
  TEST_CONFIRMED_ACTION_ID,
} from './src/constants';
import {
  configureNotifications,
  dismissTripNotifications,
  requestNotificationPermission,
  showArrivalAlarm,
} from './src/services/notifications';
import {
  addSavedRoute,
  getActiveTrip,
  getSavedRoutes,
  removeSavedRoute,
  setAlarmTestResult,
} from './src/services/storage';
import {
  snoozeTrip,
  startTrip,
  stopTrip,
} from './src/services/tracking';
import { processTripLocation } from './src/services/tripProcessor';
import type { AppColors } from './src/theme';
import {
  AppThemeProvider,
  useAppTheme,
} from './src/themeContext';
import type {
  ActiveTrip,
  Coordinates,
  Destination,
  LocationReading,
  SavedRoute,
} from './src/types';
import {
  formatDistance,
  tripProgress,
} from './src/utils/distance';
import { createId } from './src/utils/id';

const TEST_ALARM_ID_PREFIX = 'test-alarm';

export default function App() {
  return (
    <AppThemeProvider>
      <WakeStopApp />
    </AppThemeProvider>
  );
}

function WakeStopApp() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [trip, setTrip] = useState<ActiveTrip | null>(null);
  const [testAlarmTrip, setTestAlarmTrip] = useState<ActiveTrip | null>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [reliabilityVisible, setReliabilityVisible] = useState(false);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS_METERS);
  const [origin, setOrigin] = useState<Coordinates | undefined>();
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refreshTrip = useCallback(async () => {
    const [storedTrip, isBackgroundTracking] = await Promise.all([
      getActiveTrip(),
      Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK,
      ).catch(() => false),
    ]);
    setTrip(storedTrip);
    setBackgroundEnabled(isBackgroundTracking);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  const handleOpenMapPicker = useCallback(() => {
    if (trip) {
      setActiveTab('home');
      Alert.alert(
        'Trip already active',
        'Stop the current trip before choosing a new destination.',
      );
      return;
    }
    setMapPickerVisible(true);
  }, [trip]);

  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const notificationType =
        response.notification.request.content.data?.type;
      if (notificationType === 'screen-off-alarm-test') {
        await Notifications.dismissNotificationAsync(
          response.notification.request.identifier,
        ).catch(() => undefined);
        const testConfirmed =
          response.actionIdentifier === TEST_CONFIRMED_ACTION_ID ||
          response.actionIdentifier ===
            Notifications.DEFAULT_ACTION_IDENTIFIER;
        if (testConfirmed) {
          await setAlarmTestResult({
            kind: 'screen-off',
            status: 'completed',
            timestamp: Date.now(),
          });
          setNotice('Screen-off alarm test completed successfully.');
        } else {
          setNotice('Screen-off alarm test dismissed.');
        }
        return;
      }

      const responseTripId =
        response.notification.request.content.data?.tripId;
      if (
        typeof responseTripId === 'string' &&
        responseTripId.startsWith(TEST_ALARM_ID_PREFIX)
      ) {
        if (
          response.actionIdentifier === DISMISS_ACTION_ID ||
          response.actionIdentifier === SNOOZE_ACTION_ID
        ) {
          await dismissTripNotifications(responseTripId);
          await setAlarmTestResult({
            kind: 'foreground',
            status: 'completed',
            timestamp: Date.now(),
          });
          setTestAlarmTrip(null);
          setNotice(
            response.actionIdentifier === SNOOZE_ACTION_ID
              ? 'Test snooze action received. The test alarm is stopped.'
              : 'Test alarm dismissed.',
          );
        }
        return;
      }

      if (response.actionIdentifier === DISMISS_ACTION_ID) {
        setBusy(true);
        await stopTrip().finally(() => setBusy(false));
        setTrip(null);
      } else if (response.actionIdentifier === SNOOZE_ACTION_ID) {
        const snoozed = await snoozeTrip();
        setTrip(snoozed);
      } else {
        await refreshTrip();
      }
    },
    [refreshTrip],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      configureNotifications(),
      getSavedRoutes(),
      getActiveTrip(),
      Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK,
      ).catch(() => false),
    ])
      .then(async ([, storedRoutes, storedTrip, isBackgroundTracking]) => {
        if (!active) return;
        setRoutes(storedRoutes);
        setTrip(storedTrip);
        setBackgroundEnabled(isBackgroundTracking);
        setReady(true);

        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.granted) {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 10 * 60 * 1000,
            requiredAccuracy: 2_000,
          });
          if (lastKnown && active) {
            setOrigin({
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            });
          }
        }
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setReady(true);
        setNotice(
          caught instanceof Error
            ? caught.message
            : 'WakeStop could not finish its startup checks.',
        );
      });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        void handleNotificationResponse(response);
      });
    const receivedSubscription =
      Notifications.addNotificationReceivedListener(() => {
        void refreshTrip();
      });
    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') void refreshTrip();
      },
    );

    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse) {
      void handleNotificationResponse(initialResponse).finally(() =>
        Notifications.clearLastNotificationResponse(),
      );
    }

    return () => {
      active = false;
      responseSubscription.remove();
      receivedSubscription.remove();
      appStateSubscription.remove();
    };
  }, [handleNotificationResponse, refreshTrip]);

  useEffect(() => {
    if (!trip || trip.status === 'ringing') return;

    if (backgroundEnabled) {
      const refreshTimer = setInterval(() => {
        void refreshTrip();
      }, 3_000);
      return () => clearInterval(refreshTimer);
    }

    let locationSubscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5_000,
        distanceInterval: 10,
      },
      (location) => {
        const current: LocationReading = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracyMeters: location.coords.accuracy,
          speedMetersPerSecond: location.coords.speed,
        };
        setOrigin(current);
        void processTripLocation(current, location.timestamp, false).then(
          (updatedTrip) => {
            if (!cancelled) setTrip(updatedTrip);
          },
        );
      },
    ).then((subscription) => {
      if (cancelled) subscription.remove();
      else locationSubscription = subscription;
    });

    return () => {
      cancelled = true;
      locationSubscription?.remove();
    };
  }, [backgroundEnabled, refreshTrip, trip?.id, trip?.status]);

  const handleStart = async (
    selectedDestination = destination,
    selectedRadius = radiusMeters,
  ) => {
    if (!selectedDestination) {
      Alert.alert('Choose a destination', 'Search for a stop or enter coordinates.');
      return;
    }
    if (selectedRadius < 100 || selectedRadius > 20_000) {
      Alert.alert('Check the radius', 'Choose a radius from 100 to 20,000 meters.');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await startTrip(selectedDestination, selectedRadius);
      setTrip(result.trip);
      setActiveTab('home');
      setBackgroundEnabled(result.backgroundEnabled);
      setDestination(selectedDestination);
      setRadiusMeters(selectedRadius);

      if (!result.backgroundEnabled) {
        setNotice(
          'Trip started in foreground mode. Grant “Allow all the time” location access for screen-off alarms.',
        );
      } else if (!result.notificationsEnabled) {
        setNotice(
          'Trip started, but notifications are disabled. Enable them so the alarm can wake you with the screen locked.',
        );
      }
    } catch (caught) {
      Alert.alert(
        'Could not start trip',
        caught instanceof Error ? caught.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    try {
      await stopTrip();
      setTrip(null);
      setBackgroundEnabled(false);
      setNotice('Trip stopped. Location tracking is off.');
    } catch (caught) {
      Alert.alert(
        'Could not stop tracking',
        caught instanceof Error ? caught.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSnooze = async () => {
    setBusy(true);
    try {
      const snoozed = await snoozeTrip();
      setTrip(snoozed);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!destination) return;
    const route: SavedRoute = {
      id: createId('route'),
      label: destination.name,
      destination,
      radiusMeters,
      createdAt: Date.now(),
    };
    const updatedRoutes = await addSavedRoute(route);
    setRoutes(updatedRoutes);
    setNotice(`${route.label} saved for one-tap starts.`);
  };

  const handleRemoveRoute = (route: SavedRoute) => {
    Alert.alert('Remove saved stop?', route.label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void removeSavedRoute(route.id).then(setRoutes);
        },
      },
    ]);
  };

  const handleTestAlarm = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const notificationsEnabled = await requestNotificationPermission();
      if (!notificationsEnabled) {
        Alert.alert(
          'Notifications are disabled',
          'Allow WakeStop notifications in Android settings, then try again.',
        );
        return;
      }

      const now = Date.now();
      const testTrip: ActiveTrip = {
        id: createId(TEST_ALARM_ID_PREFIX),
        destination: {
          placeId: 'test-destination',
          name: 'Test destination',
          address: 'Notification and sound test',
          latitude: 0,
          longitude: 0,
        },
        radiusMeters: DEFAULT_RADIUS_METERS,
        startedAt: now,
        status: 'ringing',
        initialDistanceMeters: 250,
        lastDistanceMeters: 250,
        lastLocation: null,
        lastUpdatedAt: now,
        lastAccuracyMeters: null,
        lastReliableUpdateAt: null,
        lastProgressNotificationAt: null,
        alarmTriggeredAt: now,
        snoozedUntil: null,
      };

      setTestAlarmTrip(testTrip);
      await showArrivalAlarm(testTrip);
    } catch (caught) {
      setTestAlarmTrip(null);
      Alert.alert(
        'Could not test alarm',
        caught instanceof Error ? caught.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStopTestAlarm = async () => {
    if (!testAlarmTrip) return;

    setBusy(true);
    try {
      await dismissTripNotifications(testAlarmTrip.id);
      await setAlarmTestResult({
        kind: 'foreground',
        status: 'completed',
        timestamp: Date.now(),
      });
      setTestAlarmTrip(null);
      setNotice('Test completed. No trip or location tracking was started.');
    } finally {
      setBusy(false);
    }
  };

  if (!introComplete && trip?.status !== 'ringing') {
    return <IntroScreen onComplete={handleIntroComplete} />;
  }

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingScreen}>
          <View style={styles.loadingMark}>
            <Text style={styles.loadingMarkText}>◎</Text>
          </View>
          <Text style={styles.loadingText}>WakeStop</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (testAlarmTrip) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AlarmScreen
          busy={busy}
          isTest
          trip={testAlarmTrip}
          onDismiss={() => void handleStopTestAlarm()}
          onSnooze={() => void handleStopTestAlarm()}
        />
      </SafeAreaProvider>
    );
  }

  if (trip?.status === 'ringing') {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AlarmScreen
          busy={busy}
          trip={trip}
          onDismiss={() => void handleStop()}
          onSnooze={() => void handleSnooze()}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.appShell}>
        {activeTab === 'home' ? (
          trip ? (
            <ActiveTripScreen
              backgroundEnabled={backgroundEnabled}
              busy={busy}
              notice={notice}
              trip={trip}
              onStop={() => void handleStop()}
              onOpenSettings={() => setActiveTab('settings')}
            />
          ) : (
            <SetupScreen
              busy={busy}
              destination={destination}
              notice={notice}
              origin={origin}
              radiusMeters={radiusMeters}
              onDestinationChange={setDestination}
              onRadiusChange={setRadiusMeters}
              onSave={() => void handleSave()}
              onStart={() => void handleStart()}
              onTestAlarm={() => void handleTestAlarm()}
              onWatchIntro={() => setIntroComplete(false)}
              onOpenMap={handleOpenMapPicker}
              onOpenSettings={() => setActiveTab('settings')}
              onOpenReliability={() => setReliabilityVisible(true)}
            />
          )
        ) : activeTab === 'saved' ? (
          <SavedStopsScreen
            busy={busy}
            routes={routes}
            tripActive={Boolean(trip)}
            onCreateAlarm={() => setActiveTab('home')}
            onRemoveRoute={handleRemoveRoute}
            onStart={(route) =>
              void handleStart(route.destination, route.radiusMeters)
            }
          />
        ) : (
          <SettingsScreen
            onOpenReliability={() => setReliabilityVisible(true)}
          />
        )}
        <BottomNavigation
          activeTab={activeTab}
          tripActive={Boolean(trip)}
          onChange={setActiveTab}
        />
      </View>
      <DestinationMapPicker
        destination={destination}
        origin={origin}
        radiusMeters={radiusMeters}
        visible={mapPickerVisible}
        onCancel={() => setMapPickerVisible(false)}
        onConfirm={(selectedDestination, selectedRadius) => {
          setDestination(selectedDestination);
          setRadiusMeters(selectedRadius);
          setMapPickerVisible(false);
          setActiveTab('home');
        }}
      />
      <ReliabilityCenterModal
        visible={reliabilityVisible}
        onClose={() => setReliabilityVisible(false)}
        onRunAlarmTest={() => {
          setReliabilityVisible(false);
          void handleTestAlarm();
        }}
      />
    </SafeAreaProvider>
  );
}

type SetupScreenProps = {
  busy: boolean;
  destination: Destination | null;
  notice: string | null;
  origin?: Coordinates;
  radiusMeters: number;
  onDestinationChange: (destination: Destination | null) => void;
  onRadiusChange: (radiusMeters: number) => void;
  onSave: () => void;
  onStart: () => void;
  onTestAlarm: () => void;
  onWatchIntro: () => void;
  onOpenMap: () => void;
  onOpenSettings: () => void;
  onOpenReliability: () => void;
};

function SetupScreen({
  busy,
  destination,
  notice,
  origin,
  radiusMeters,
  onDestinationChange,
  onRadiusChange,
  onSave,
  onStart,
  onTestAlarm,
  onWatchIntro,
  onOpenMap,
  onOpenSettings,
  onOpenReliability,
}: SetupScreenProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>◎</Text>
          </View>
          <Text style={styles.brandName}>WakeStop</Text>
          <View style={styles.readyPill}>
            <View style={styles.readyDot} />
            <Text style={styles.readyText}>READY</Text>
          </View>
          <Pressable
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerSettingsButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onOpenSettings}
          >
            <SimpleLineIcons
              color={colors.ink}
              name="settings"
              size={24}
            />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>LOCATION ALARM</Text>
          <Text style={styles.heroTitle}>Sleep through the ride,{'\n'}not your stop.</Text>
          <Text style={styles.heroBody}>
            Pick a destination and WakeStop will track your trip locally, even
            with the screen locked.
          </Text>
        </View>

        {notice ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <SectionLabel number="1" title="Where should we wake you?" />
        <DestinationSearch
          origin={origin}
          value={destination}
          onChange={onDestinationChange}
          onOpenMap={onOpenMap}
        />

        <View style={styles.sectionGap} />
        <SectionLabel number="2" title="How early?" />
        <RadiusSelector value={radiusMeters} onChange={onRadiusChange} />
        <Text style={styles.helper}>
          Straight-line distance. 500 m is a good starting point for city buses.
        </Text>

        {destination ? (
          <>
            <View style={styles.sectionGap} />
            <TripMap
              currentLocation={origin}
              destination={destination}
              radiusMeters={radiusMeters}
              onPress={onOpenMap}
            />
            <Pressable style={styles.saveButton} onPress={onSave}>
              <Text style={styles.saveButtonText}>＋ Save for one-tap start</Text>
            </Pressable>
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy || !destination}
          style={({ pressed }) => [
            styles.startButton,
            (!destination || busy) && styles.startButtonDisabled,
            pressed && destination && !busy && styles.buttonPressed,
          ]}
          onPress={() => onStart()}
        >
          <Text
            style={[
              styles.startButtonText,
              (!destination || busy) && styles.startButtonTextDisabled,
            ]}
          >
            {busy ? 'Preparing permissions…' : 'Start trip'}
          </Text>
        </Pressable>

        {__DEV__ ? (
          <>
            <Pressable
              accessibilityHint="Replays the app launch animation"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.introPreviewButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onWatchIntro}
            >
              <Text style={styles.introPreviewIcon}>↻</Text>
              <View style={styles.introPreviewCopy}>
                <Text style={styles.introPreviewTitle}>
                  Watch animated intro
                </Text>
                <Text style={styles.introPreviewBody}>
                  Replay it without restarting the app
                </Text>
              </View>
              <Text style={styles.introPreviewArrow}>→</Text>
            </Pressable>

            <View style={styles.testAlarmCard}>
              <View style={styles.testAlarmCopy}>
                <Text style={styles.testAlarmTitle}>Test the arrival alarm</Text>
                <Text style={styles.testAlarmBody}>
                  Sends a real notification and plays the bundled alarm sound
                  and vibration. GPS tracking will not start.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                style={({ pressed }) => [
                styles.testAlarmButton,
                pressed && styles.buttonPressed,
                busy && styles.testAlarmButtonDisabled,
                ]}
                onPress={onTestAlarm}
              >
                <Text style={styles.testAlarmButtonText}>
                  {busy ? 'Starting test…' : 'Test notification & alarm'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.reliabilityCard,
            pressed && styles.buttonPressed,
          ]}
          onPress={onOpenReliability}
        >
          <View style={styles.reliabilityCardHeader}>
            <Text style={styles.reliabilityTitle}>
              Check alarm reliability
            </Text>
            <Text style={styles.reliabilityArrow}>→</Text>
          </View>
          <Text style={styles.reliabilityBody}>
            Verify precise and background location, notifications, alarm sound,
            battery settings, and screen-off behavior.
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type SavedStopsScreenProps = {
  busy: boolean;
  routes: SavedRoute[];
  tripActive: boolean;
  onCreateAlarm: () => void;
  onRemoveRoute: (route: SavedRoute) => void;
  onStart: (route: SavedRoute) => void;
};

function SavedStopsScreen({
  busy,
  routes,
  tripActive,
  onCreateAlarm,
  onRemoveRoute,
  onStart,
}: SavedStopsScreenProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.savedScreenContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.savedHeader}>
          <Text style={styles.savedEyebrow}>QUICK START</Text>
          <Text style={styles.savedScreenTitle}>Saved stops</Text>
          <Text style={styles.savedScreenBody}>
            Start a familiar journey with the alarm distance you saved.
          </Text>
        </View>

        {tripActive ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.activeTripBanner,
              pressed && styles.buttonPressed,
            ]}
            onPress={onCreateAlarm}
          >
            <View style={styles.activeTripBannerDot} />
            <View style={styles.activeTripBannerCopy}>
              <Text style={styles.activeTripBannerTitle}>
                A trip is currently active
              </Text>
              <Text style={styles.activeTripBannerBody}>
                Open Home to view or stop it before starting another.
              </Text>
            </View>
            <Text style={styles.activeTripBannerArrow}>→</Text>
          </Pressable>
        ) : null}

        {routes.length > 0 ? (
          <View style={styles.savedList}>
            {routes.map((route) => (
              <View key={route.id} style={styles.routeCard}>
                <Pressable
                  accessibilityHint={
                    tripActive
                      ? 'Stop the active trip before starting this saved stop'
                      : `Starts an alarm for ${route.label}`
                  }
                  accessibilityRole="button"
                  disabled={busy || tripActive}
                  style={({ pressed }) => [
                    styles.routeStart,
                    (busy || tripActive) && styles.savedRouteDisabled,
                    pressed && !busy && !tripActive && styles.buttonPressed,
                  ]}
                  onPress={() => onStart(route)}
                >
                  <View style={styles.routeIcon}>
                    <Text style={styles.routeIconText}>⌖</Text>
                  </View>
                  <View style={styles.routeCopy}>
                    <Text style={styles.routeName}>{route.label}</Text>
                    <Text
                      numberOfLines={1}
                      style={styles.routeAddress}
                    >
                      {route.destination.address}
                    </Text>
                    <Text style={styles.routeMeta}>
                      Alarm at {formatDistance(route.radiusMeters)}
                    </Text>
                  </View>
                  <Text style={styles.routeArrow}>
                    {tripActive ? 'Active' : 'Start →'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Remove ${route.label}`}
                  accessibilityRole="button"
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.removeButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => onRemoveRoute(route)}
                >
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptySavedCard}>
            <View style={styles.emptySavedIcon}>
              <Text style={styles.emptySavedIconText}>★</Text>
            </View>
            <Text style={styles.emptySavedTitle}>No saved stops yet</Text>
            <Text style={styles.emptySavedBody}>
              Choose a destination on Home, then tap “Save for one-tap start.”
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.emptySavedButton,
                pressed && styles.buttonPressed,
              ]}
            onPress={onCreateAlarm}
          >
            <Text style={styles.emptySavedButtonText}>Create an alarm</Text>
          </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ number, title }: { number: string; title: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.sectionLabel}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

type ActiveTripScreenProps = {
  backgroundEnabled: boolean;
  busy: boolean;
  notice: string | null;
  trip: ActiveTrip;
  onStop: () => void;
  onOpenSettings: () => void;
};

function ActiveTripScreen({
  backgroundEnabled,
  busy,
  notice,
  trip,
  onStop,
  onOpenSettings,
}: ActiveTripScreenProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const progress = tripProgress(
    trip.initialDistanceMeters,
    trip.lastDistanceMeters,
  );
  const snoozeSeconds = useMemo(
    () =>
      trip.snoozedUntil
        ? Math.max(0, Math.ceil((trip.snoozedUntil - now) / 1_000))
        : 0,
    [now, trip.snoozedUntil],
  );
  const snoozeMinutes = Math.floor(snoozeSeconds / 60);
  const snoozeRemainder = String(snoozeSeconds % 60).padStart(2, '0');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.activeContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.activeHeader}>
          <View>
            <Text style={styles.activeBrand}>WakeStop</Text>
            <Text style={styles.activeSubtitle}>Trip in progress</Text>
          </View>
          <Pressable
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerSettingsButton,
              styles.activeSettingsButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onOpenSettings}
          >
            <SimpleLineIcons
              color={colors.ink}
              name="settings"
              size={24}
            />
          </Pressable>
          <View style={styles.armedPill}>
            <View style={styles.armedDot} />
            <Text style={styles.armedText}>
              {trip.status === 'snoozed' ? 'SNOOZED' : 'ARMED'}
            </Text>
          </View>
        </View>

        <View style={styles.distanceCard}>
          <Text style={styles.distanceLabel}>DISTANCE REMAINING</Text>
          <Text style={styles.distanceValue}>
            {formatDistance(trip.lastDistanceMeters)}
          </Text>
          <Text style={styles.distanceDestination}>
            to {trip.destination.name}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.radiusCopy}>
            Alarm triggers inside {formatDistance(trip.radiusMeters)}
          </Text>
        </View>

        {trip.status === 'snoozed' ? (
          <View style={styles.snoozeCard}>
            <Text style={styles.snoozeCardTitle}>Alarm snoozed</Text>
            <Text style={styles.snoozeCountdown}>
              {snoozeMinutes}:{snoozeRemainder}
            </Text>
            <Text style={styles.snoozeCardBody}>
              Tracking continues. If you are still inside the radius, the alarm
              will ring again.
            </Text>
          </View>
        ) : null}

        {notice ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <View style={styles.trackingStatus}>
          <View style={styles.trackingIcon}>
            <Text style={styles.trackingIconText}>
              {backgroundEnabled ? '✓' : '!'}
            </Text>
          </View>
          <View style={styles.trackingCopy}>
            <Text style={styles.trackingTitle}>
              {backgroundEnabled
                ? 'Screen-off tracking active'
                : 'Foreground tracking only'}
            </Text>
            <Text style={styles.trackingBody}>
              {backgroundEnabled
                ? 'A persistent Android notification confirms the location service is alive.'
                : 'Keep WakeStop open, or grant background location in system settings.'}
            </Text>
          </View>
        </View>

        <TripMap
          currentLocation={trip.lastLocation}
          destination={trip.destination}
          height={260}
          radiusMeters={trip.radiusMeters}
        />

        <Text style={styles.lastUpdate}>
          {trip.lastUpdatedAt
            ? `Last GPS update ${new Date(trip.lastUpdatedAt).toLocaleTimeString()}`
            : 'Waiting for the first GPS update'}
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={({ pressed }) => [
            styles.stopButton,
            pressed && styles.buttonPressed,
            busy && styles.startButtonDisabled,
          ]}
          onPress={onStop}
        >
          <Text style={styles.stopButtonText}>
            {busy ? 'Stopping tracking…' : 'Stop trip'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 38,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingMark: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMarkText: {
    color: colors.white,
    fontSize: 38,
    fontWeight: '900',
  },
  loadingText: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 14,
  },
  brandRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
  },
  brandMarkText: {
    color: colors.white,
    fontSize: 23,
    fontWeight: '900',
  },
  brandName: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 10,
  },
  readyPill: {
    marginLeft: 'auto',
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.teal,
    marginRight: 6,
  },
  readyText: {
    color: colors.tealDark,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSettingsButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  activeSettingsButton: {
    marginLeft: 'auto',
  },
  hero: {
    paddingTop: 42,
    paddingBottom: 30,
  },
  eyebrow: {
    color: colors.orangeDark,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 9,
  },
  heroBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 500,
  },
  notice: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.gray,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  noticeText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    color: colors.orangeDark,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 9,
  },
  sectionGap: {
    height: 28,
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  saveButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: colors.tealSoft,
  },
  saveButtonText: {
    color: colors.tealDark,
    fontSize: 14,
    fontWeight: '800',
  },
  startButton: {
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    shadowColor: colors.orangeDark,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  startButtonDisabled: {
    backgroundColor: colors.gray,
    shadowOpacity: 0,
  },
  startButtonText: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '900',
  },
  startButtonTextDisabled: {
    color: colors.muted,
  },
  testAlarmCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.gray,
    padding: 16,
    marginTop: 16,
  },
  introPreviewButton: {
    minHeight: 68,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  introPreviewIcon: {
    width: 38,
    color: colors.tealDark,
    fontSize: 28,
    fontWeight: '700',
  },
  introPreviewCopy: {
    flex: 1,
  },
  introPreviewTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  introPreviewBody: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  introPreviewArrow: {
    color: colors.tealDark,
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 10,
  },
  testAlarmCopy: {
    marginBottom: 12,
  },
  testAlarmTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  testAlarmBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  testAlarmButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
  },
  testAlarmButtonText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '900',
  },
  testAlarmButtonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  savedSection: {
    marginTop: 34,
  },
  savedScreenContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
  },
  savedHeader: {
    paddingBottom: 22,
  },
  savedEyebrow: {
    color: colors.orange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  savedScreenTitle: {
    color: colors.ink,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '900',
    marginTop: 3,
  },
  savedScreenBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  savedList: {
    gap: 10,
  },
  savedTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 11,
  },
  routeCard: {
    minHeight: 72,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    paddingRight: 14,
  },
  routeStart: {
    flex: 1,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  routeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIconText: {
    color: colors.tealDark,
    fontSize: 21,
    fontWeight: '900',
  },
  routeCopy: {
    flex: 1,
    paddingHorizontal: 11,
  },
  routeName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  routeMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  routeAddress: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  routeArrow: {
    color: colors.orangeDark,
    fontSize: 13,
    fontWeight: '900',
  },
  savedRouteDisabled: {
    opacity: 0.48,
  },
  removeButton: {
    minWidth: 38,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: colors.muted,
    fontSize: 24,
    lineHeight: 26,
    marginLeft: 8,
  },
  activeTripBanner: {
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 16,
  },
  activeTripBannerDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.orange,
  },
  activeTripBannerCopy: {
    flex: 1,
    paddingHorizontal: 12,
  },
  activeTripBannerTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  activeTripBannerBody: {
    color: colors.white,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
    opacity: 0.72,
  },
  activeTripBannerArrow: {
    color: colors.orange,
    fontSize: 22,
    fontWeight: '900',
  },
  emptySavedCard: {
    flex: 1,
    minHeight: 360,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptySavedIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySavedIconText: {
    color: colors.orange,
    fontSize: 29,
    fontWeight: '900',
  },
  emptySavedTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 18,
  },
  emptySavedBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 280,
  },
  emptySavedButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 22,
  },
  emptySavedButtonText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '900',
  },
  reliabilityCard: {
    borderRadius: 18,
    backgroundColor: colors.gray,
    padding: 17,
    marginTop: 28,
  },
  reliabilityTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  reliabilityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reliabilityArrow: {
    color: colors.orange,
    fontSize: 22,
    fontWeight: '900',
    marginLeft: 'auto',
  },
  reliabilityBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
  },
  activeContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  activeBrand: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  activeSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  armedPill: {
    marginLeft: 8,
    borderRadius: 17,
    backgroundColor: colors.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  armedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
    marginRight: 7,
  },
  armedText: {
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  distanceCard: {
    borderRadius: 26,
    backgroundColor: colors.teal,
    paddingHorizontal: 22,
    paddingVertical: 26,
    marginBottom: 14,
  },
  distanceLabel: {
    color: colors.gray,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  distanceValue: {
    color: colors.white,
    fontSize: 55,
    lineHeight: 64,
    fontWeight: '900',
    letterSpacing: -2,
    marginTop: 6,
  },
  distanceDestination: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.black,
    overflow: 'hidden',
    marginTop: 24,
  },
  progressFill: {
    height: '100%',
    minWidth: 5,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  radiusCopy: {
    color: colors.gray,
    fontSize: 12,
    marginTop: 10,
  },
  snoozeCard: {
    borderRadius: 20,
    backgroundColor: colors.orangeSoft,
    alignItems: 'center',
    padding: 18,
    marginBottom: 14,
  },
  snoozeCardTitle: {
    color: colors.orangeDark,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  snoozeCountdown: {
    color: colors.ink,
    fontSize: 37,
    fontWeight: '900',
    marginTop: 5,
  },
  snoozeCardBody: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 5,
  },
  trackingStatus: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 14,
  },
  trackingIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingIconText: {
    color: colors.tealDark,
    fontSize: 20,
    fontWeight: '900',
  },
  trackingCopy: {
    flex: 1,
    marginLeft: 12,
  },
  trackingTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  trackingBody: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  lastUpdate: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
  stopButton: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.black,
    backgroundColor: colors.gray,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  stopButtonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '900',
  },
  });
}
