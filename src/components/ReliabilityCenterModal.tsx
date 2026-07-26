import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SCREEN_OFF_TEST_DELAY_SECONDS } from '../constants';
import {
  requestNotificationPermission,
  scheduleScreenOffAlarmTest,
} from '../services/notifications';
import {
  getReliabilitySnapshot,
  openReliabilityAction,
  type ReliabilityAction,
  type ReliabilityCheck,
  type ReliabilitySnapshot,
  type ReliabilityStatus,
} from '../services/reliability';
import {
  getAlarmTestResult,
  setAlarmTestResult,
} from '../services/storage';
import type { AppColors } from '../theme';
import type { AlarmTestResult } from '../types';
import { useAppTheme } from '../themeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onRunAlarmTest: () => void;
};

const STATUS_COPY: Record<
  ReliabilityStatus,
  { icon: string; label: string }
> = {
  ready: { icon: '✓', label: 'Ready' },
  action: { icon: '!', label: 'Action needed' },
  info: { icon: 'i', label: 'Information' },
  manual: { icon: '?', label: 'Manual check' },
};

export function ReliabilityCenterModal({
  visible,
  onClose,
  onRunAlarmTest,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [snapshot, setSnapshot] = useState<ReliabilitySnapshot | null>(null);
  const [lastTest, setLastTest] = useState<AlarmTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [testDeadline, setTestDeadline] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSnapshot, storedTest] = await Promise.all([
        getReliabilitySnapshot(),
        getAlarmTestResult(),
      ]);
      setSnapshot(nextSnapshot);
      setLastTest(storedTest);
      setTestDeadline(
        storedTest?.kind === 'screen-off' &&
          storedTest.status === 'scheduled'
          ? storedTest.timestamp + SCREEN_OFF_TEST_DELAY_SECONDS * 1_000
          : null,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not complete the reliability checks.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void refresh();
  }, [refresh, visible]);

  useEffect(() => {
    if (!visible) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh, visible]);

  useEffect(() => {
    if (!testDeadline) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      setCountdown(
        Math.max(0, Math.ceil((testDeadline - Date.now()) / 1_000)),
      );
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 500);
    return () => clearInterval(timer);
  }, [testDeadline]);

  const handleAction = async (action: ReliabilityAction) => {
    await openReliabilityAction(action);
  };

  const handleScheduleScreenOffTest = async () => {
    setScheduling(true);
    setError(null);
    try {
      const notificationsEnabled = await requestNotificationPermission();
      if (!notificationsEnabled) {
        setError('Enable WakeStop notifications before running this test.');
        return;
      }

      await scheduleScreenOffAlarmTest();
      const result: AlarmTestResult = {
        kind: 'screen-off',
        status: 'scheduled',
        timestamp: Date.now(),
      };
      await setAlarmTestResult(result);
      setLastTest(result);
      setTestDeadline(
        result.timestamp + SCREEN_OFF_TEST_DELAY_SECONDS * 1_000,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not schedule the screen-off test.',
      );
    } finally {
      setScheduling(false);
    }
  };

  const confirmScreenOffTest = async () => {
    const result: AlarmTestResult = {
      kind: 'screen-off',
      status: 'completed',
      timestamp: Date.now(),
    };
    await setAlarmTestResult(result);
    setLastTest(result);
    setTestDeadline(null);
  };

  const allRequiredReady =
    snapshot &&
    snapshot.requiredReady === snapshot.requiredTotal;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ALARM READINESS</Text>
            <Text style={styles.title}>Reliability Center</Text>
          </View>
          <Pressable
            accessibilityLabel="Close Reliability Center"
            accessibilityRole="button"
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.summaryCard,
              allRequiredReady && styles.summaryCardReady,
            ]}
          >
            <View style={styles.summaryTop}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryIconText}>
                  {allRequiredReady ? '✓' : '!'}
                </Text>
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>
                  {allRequiredReady
                    ? 'Ready for a real trip'
                    : 'Setup needs attention'}
                </Text>
                <Text style={styles.summaryBody}>
                  {snapshot
                    ? `${snapshot.requiredReady} of ${snapshot.requiredTotal} required checks are ready.`
                    : 'Checking permissions and Android services…'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Refresh reliability checks"
                accessibilityRole="button"
                disabled={loading}
                style={({ pressed }) => [
                  styles.refreshButton,
                  pressed && styles.pressed,
                  loading && styles.disabled,
                ]}
                onPress={() => void refresh()}
              >
                <Text style={styles.refreshText}>{loading ? '…' : '↻'}</Text>
              </Pressable>
            </View>
            <Text style={styles.summaryCaveat}>
              No mobile app can guarantee an alarm after force-stop, Do Not
              Disturb, or aggressive manufacturer task killing.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Readiness checks</Text>
          <Text style={styles.sectionBody}>
            Reopen this screen after changing Android settings to refresh the
            results automatically.
          </Text>

          <View style={styles.checkList}>
            {(snapshot?.checks ?? []).map((check) => (
              <ReliabilityCheckRow
                key={check.id}
                check={check}
                onAction={handleAction}
                styles={styles}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, styles.testSectionTitle]}>
            Test your alarm
          </Text>
          <Text style={styles.sectionBody}>
            Run both tests before relying on WakeStop during a real journey.
          </Text>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryTestButton,
              pressed && styles.pressed,
            ]}
            onPress={onRunAlarmTest}
          >
            <View style={styles.testIcon}>
              <Text style={styles.testIconText}>♪</Text>
            </View>
            <View style={styles.testCopy}>
              <Text style={styles.primaryTestTitle}>
                Test notification, sound, and vibration
              </Text>
              <Text style={styles.primaryTestBody}>
                Opens the full WakeStop alarm screen immediately.
              </Text>
            </View>
            <Text style={styles.primaryTestArrow}>→</Text>
          </Pressable>

          <View style={styles.screenOffCard}>
            <Text style={styles.screenOffTitle}>Screen-off test</Text>
            <Text style={styles.screenOffBody}>
              Schedule an alarm for {SCREEN_OFF_TEST_DELAY_SECONDS} seconds,
              then immediately lock your phone. Use the notification’s “Test
              worked” action or confirm below after unlocking.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={scheduling || countdown > 0}
              style={({ pressed }) => [
                styles.screenOffButton,
                pressed && styles.pressed,
                (scheduling || countdown > 0) && styles.disabled,
              ]}
              onPress={() => void handleScheduleScreenOffTest()}
            >
              <Text style={styles.screenOffButtonText}>
                {scheduling
                  ? 'Scheduling…'
                  : countdown > 0
                    ? `Lock screen now · ${countdown}`
                    : 'Schedule screen-off test'}
              </Text>
            </Pressable>

            {lastTest?.kind === 'screen-off' &&
            lastTest.status === 'scheduled' &&
            countdown === 0 ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.confirmButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => void confirmScreenOffTest()}
              >
                <Text style={styles.confirmButtonText}>
                  I heard the screen-off alarm
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.lastTestCard}>
            <Text style={styles.lastTestLabel}>LAST TEST</Text>
            <Text style={styles.lastTestValue}>
              {lastTest
                ? `${lastTest.kind === 'foreground' ? 'Full alarm' : 'Screen-off alarm'} · ${lastTest.status}`
                : 'No completed tests yet'}
            </Text>
            {lastTest ? (
              <Text style={styles.lastTestTime}>
                {new Date(lastTest.timestamp).toLocaleString()}
              </Text>
            ) : null}
          </View>

          <View style={styles.checklistCard}>
            <Text style={styles.checklistTitle}>
              Before your first real ride
            </Text>
            <Text style={styles.checklistItem}>
              1. Complete both alarm tests while stationary.
            </Text>
            <Text style={styles.checklistItem}>
              2. Set WakeStop battery usage to Unrestricted if needed.
            </Text>
            <Text style={styles.checklistItem}>
              3. Do not force-stop the app after arming a trip.
            </Text>
            <Text style={styles.checklistItem}>
              4. Start with a 500 m radius and adjust after a real test ride.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

type ReliabilityStyles = ReturnType<typeof createStyles>;

function ReliabilityCheckRow({
  check,
  onAction,
  styles,
}: {
  check: ReliabilityCheck;
  onAction: (action: ReliabilityAction) => Promise<void>;
  styles: ReliabilityStyles;
}) {
  const statusCopy = STATUS_COPY[check.status];
  return (
    <View
      style={[
        styles.checkRow,
        check.status === 'action' && styles.checkRowAction,
      ]}
    >
      <View
        style={[
          styles.checkIcon,
          check.status === 'action' && styles.checkIconAction,
        ]}
      >
        <Text
          style={[
            styles.checkIconText,
            check.status === 'action' && styles.checkIconTextAction,
          ]}
        >
          {statusCopy.icon}
        </Text>
      </View>
      <View style={styles.checkCopy}>
        <View style={styles.checkTitleRow}>
          <Text style={styles.checkTitle}>{check.title}</Text>
          <Text
            style={[
              styles.checkStatus,
              check.status === 'action' && styles.checkStatusAction,
            ]}
          >
            {statusCopy.label}
          </Text>
        </View>
        <Text style={styles.checkDetail}>{check.detail}</Text>
      </View>
      {check.action ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={6}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
          ]}
          onPress={() => void onAction(check.action!)}
        >
          <Text style={styles.actionButtonText}>Open</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      minHeight: 86,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    eyebrow: {
      color: colors.orange,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.5,
    },
    title: {
      color: colors.ink,
      fontSize: 25,
      fontWeight: '900',
      marginTop: 2,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: colors.gray,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 'auto',
    },
    closeText: {
      color: colors.ink,
      fontSize: 30,
      lineHeight: 32,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 44,
    },
    summaryCard: {
      borderRadius: 23,
      borderWidth: 1,
      borderColor: colors.orange,
      backgroundColor: colors.gray,
      padding: 17,
    },
    summaryCardReady: {
      borderColor: colors.border,
    },
    summaryTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: colors.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryIconText: {
      color: colors.black,
      fontSize: 23,
      fontWeight: '900',
    },
    summaryCopy: {
      flex: 1,
      paddingHorizontal: 12,
    },
    summaryTitle: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: '900',
    },
    summaryBody: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },
    refreshButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    refreshText: {
      color: colors.ink,
      fontSize: 22,
      fontWeight: '800',
    },
    summaryCaveat: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 13,
    },
    errorCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.orange,
      padding: 12,
      marginTop: 12,
    },
    errorText: {
      color: colors.ink,
      fontSize: 12,
      lineHeight: 17,
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 19,
      fontWeight: '900',
      marginTop: 27,
    },
    sectionBody: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
    },
    checkList: {
      gap: 9,
      marginTop: 15,
    },
    checkRow: {
      minHeight: 78,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    checkRowAction: {
      borderColor: colors.orange,
    },
    checkIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.gray,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkIconAction: {
      backgroundColor: colors.orange,
    },
    checkIconText: {
      color: colors.ink,
      fontSize: 17,
      fontWeight: '900',
    },
    checkIconTextAction: {
      color: colors.black,
    },
    checkCopy: {
      flex: 1,
      paddingLeft: 10,
    },
    checkTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkTitle: {
      flex: 1,
      color: colors.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    checkStatus: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    checkStatusAction: {
      color: colors.orange,
    },
    checkDetail: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 4,
    },
    actionButton: {
      minWidth: 48,
      minHeight: 34,
      borderRadius: 11,
      backgroundColor: colors.gray,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
      paddingHorizontal: 8,
    },
    actionButtonText: {
      color: colors.ink,
      fontSize: 10,
      fontWeight: '900',
    },
    testSectionTitle: {
      marginTop: 32,
    },
    primaryTestButton: {
      minHeight: 82,
      borderRadius: 19,
      backgroundColor: colors.orange,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      marginTop: 15,
    },
    testIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: colors.black,
      alignItems: 'center',
      justifyContent: 'center',
    },
    testIconText: {
      color: colors.white,
      fontSize: 21,
      fontWeight: '900',
    },
    testCopy: {
      flex: 1,
      paddingHorizontal: 11,
    },
    primaryTestTitle: {
      color: colors.black,
      fontSize: 13,
      fontWeight: '900',
    },
    primaryTestBody: {
      color: colors.black,
      fontSize: 10,
      lineHeight: 14,
      marginTop: 3,
      opacity: 0.72,
    },
    primaryTestArrow: {
      color: colors.black,
      fontSize: 22,
      fontWeight: '900',
    },
    screenOffCard: {
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16,
      marginTop: 12,
    },
    screenOffTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '900',
    },
    screenOffBody: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 5,
    },
    screenOffButton: {
      minHeight: 47,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.orange,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 13,
    },
    screenOffButtonText: {
      color: colors.orangeDark,
      fontSize: 12,
      fontWeight: '900',
    },
    confirmButton: {
      minHeight: 43,
      borderRadius: 13,
      backgroundColor: colors.gray,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 9,
    },
    confirmButtonText: {
      color: colors.ink,
      fontSize: 11,
      fontWeight: '900',
    },
    lastTestCard: {
      borderRadius: 17,
      backgroundColor: colors.gray,
      padding: 15,
      marginTop: 12,
    },
    lastTestLabel: {
      color: colors.orange,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    lastTestValue: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '900',
      marginTop: 4,
      textTransform: 'capitalize',
    },
    lastTestTime: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 3,
    },
    checklistCard: {
      borderRadius: 19,
      backgroundColor: colors.gray,
      padding: 16,
      marginTop: 24,
    },
    checklistTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 8,
    },
    checklistItem: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 18,
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.99 }],
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
