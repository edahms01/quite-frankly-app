import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import {
  getStoredPreferences,
  setStoredPreferences,
  registerForPushNotifications,
  DEFAULT_PREFERENCES,
} from '../../lib/pushNotifications';

const INITIAL = [
  { key: 'live', label: 'Live Alerts' },
  { key: 'video', label: 'New Video Alerts' },
  // No trigger wired yet (see CLAUDE.md's "Known open items") — kept
  // visible as a teaser for the feature, grayed out and non-interactive
  // rather than hidden, since toggling it would have no real effect.
  { key: 'club', label: 'Culture Club Event Reminders', disabled: true },
];

export default function NotificationsSettings({ navigation }) {
  const [values, setValues] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    (async () => {
      const cached = await getStoredPreferences();
      setValues(cached);
      // Covers someone who skipped onboarding's prompt but enabled OS
      // permission later — no-ops safely if permission still isn't
      // granted or the EAS projectId isn't configured yet.
      registerForPushNotifications(cached);
    })();
  }, []);

  const handleToggle = (key, value) => {
    const next = { ...values, [key]: value };
    setValues(next);
    setStoredPreferences(next);
    registerForPushNotifications(next);
  };

  return (
    <View style={styles.container}>
      <BackHeader title="Notifications" navigation={navigation} />
      <View style={styles.body}>
        {INITIAL.map((item) => (
          <View key={item.key} style={styles.row}>
            <Text style={[styles.label, item.disabled && styles.labelDisabled]}>{item.label}</Text>
            <Switch
              value={item.disabled ? false : values[item.key]}
              onValueChange={(v) => handleToggle(item.key, v)}
              disabled={item.disabled}
              trackColor={{ false: colors.surfaceLine, true: colors.accentGold }}
              thumbColor={colors.inkPrimary}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  body: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  label: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  // Same muted "coming soon" shade as DestinationCard's — see its
  // inkMutedDark comment for why this isn't the shared colors.inkMuted
  // token (that's the app's general secondary-text color).
  labelDisabled: {
    color: '#5C554E',
  },
});
