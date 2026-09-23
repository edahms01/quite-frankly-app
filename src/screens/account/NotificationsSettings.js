import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';

const INITIAL = [
  { key: 'live', label: 'Live Alerts' },
  { key: 'video', label: 'New Video Alerts' },
  { key: 'club', label: 'Culture Club Event Reminders' },
];

export default function NotificationsSettings({ navigation }) {
  const [values, setValues] = useState({ live: true, video: true, club: true });

  return (
    <View style={styles.container}>
      <BackHeader title="Notifications" navigation={navigation} />
      <View style={styles.body}>
        {INITIAL.map((item) => (
          <View key={item.key} style={styles.row}>
            <Text style={styles.label}>{item.label}</Text>
            <Switch
              value={values[item.key]}
              onValueChange={(v) => setValues((prev) => ({ ...prev, [item.key]: v }))}
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
