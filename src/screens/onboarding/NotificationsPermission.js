import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Bell } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme';
import { title as titlePreset, buttonPrimary, buttonPrimaryText } from '../../design/qf-presets';
import OnboardingDots from '../../components/OnboardingDots';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { onboardingDotCount, onboardingNextRoute } from '../../lib/featureFlags';
import { registerForPushNotifications, DEFAULT_PREFERENCES } from '../../lib/pushNotifications';

export default function NotificationsPermission({ navigation }) {
  const insets = useSafeAreaInsets();
  const flags = useFeatureFlags();
  const [requesting, setRequesting] = useState(false);

  // Email -> CodeEntry only with accounts on; otherwise straight into the app (the screens stay registered).
  const goNext = () => navigation.navigate(onboardingNextRoute(flags));

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        await registerForPushNotifications(DEFAULT_PREFERENCES);
      }
    } finally {
      setRequesting(false);
      goNext();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.skip, { top: insets.top + spacing.sm }]}
        onPress={goNext}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <OnboardingDots total={onboardingDotCount(flags)} activeIndex={1} />
        <View style={styles.iconCircle}>
          <Bell color={colors.accentGold} size={32} />
        </View>
        <Text style={styles.title}>Never miss a show</Text>
        <Text style={styles.body}>
          Get notified the moment Frank goes live or when a new video drops.
        </Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={handleEnable}
          disabled={requesting}
        >
          <Text style={styles.ctaText}>
            {requesting ? 'Requesting…' : 'Enable'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.notNow} onPress={goNext}>
          <Text style={styles.notNowText}>Not Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  skip: {
    position: 'absolute',
    right: spacing.lg,
    padding: spacing.xs,
  },
  skipText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...titlePreset,
    textAlign: 'center',
  },
  body: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  cta: {
    ...buttonPrimary,
    alignSelf: 'stretch',
  },
  ctaText: buttonPrimaryText,
  notNow: {
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  notNowText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
});
