import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme';
import OnboardingDots from '../../components/OnboardingDots';

export default function Welcome({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.skip}
        onPress={() => navigation.navigate('MainTabs')}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <OnboardingDots total={3} activeIndex={0} />
        <Image
          source={require('../../assets/images/quite-frankly-logo-final.png')}
          style={styles.wordmark}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Live weeknights · 7:00 PM ET</Text>
        <Text style={styles.body}>
          The Quite Frankly Universe. All in one place.
        </Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => navigation.navigate('NotificationsPermission')}
        >
          <Text style={styles.ctaText}>Get Started</Text>
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
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  wordmark: {
    width: 280,
    height: 280 * (404 / 1720),
    alignSelf: 'center',
  },
  subtitle: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  body: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  cta: {
    backgroundColor: colors.brandRed,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
  },
});
