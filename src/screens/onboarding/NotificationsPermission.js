import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Bell } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme';
import OnboardingDots from '../../components/OnboardingDots';

export default function NotificationsPermission({ navigation }) {
  const [requesting, setRequesting] = useState(false);

  const goNext = () => navigation.navigate('Email');

  const handleEnable = async () => {
    setRequesting(true);
    try {
      await Notifications.requestPermissionsAsync();
    } finally {
      setRequesting(false);
      goNext();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={goNext}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <OnboardingDots total={3} activeIndex={1} />
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
    top: spacing.lg,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xxl,
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
    backgroundColor: colors.brandRed,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ctaText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
  },
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
