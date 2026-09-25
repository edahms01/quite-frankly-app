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
  { key: 'club', label: 'Culture Club Event Reminders' },
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
            <Text style={styles.label}>{item.label}</Text>
            <Switch
              value={values[item.key]}
              onValueChange={(v) => handleToggle(item.key, v)}
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
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
});
