import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Mail } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme';
import OnboardingDots from '../../components/OnboardingDots';

export default function Email({ navigation }) {
  const [email, setEmail] = useState('');

  // Submission (storage only, no verification) is Phase 3/4 — this just
  // completes onboarding for now.
  const finishOnboarding = () => navigation.navigate('MainTabs');

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={finishOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <OnboardingDots total={3} activeIndex={2} />
        <View style={styles.iconCircle}>
          <Mail color={colors.accentGold} size={32} />
        </View>
        <Text style={styles.title}>Add your email</Text>
        <Text style={styles.body}>
          We'll send a one-time code — no password needed.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={colors.inkMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TouchableOpacity style={styles.cta} onPress={finishOnboarding}>
          <Text style={styles.ctaText}>Continue</Text>
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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
  input: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceLine,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.inkPrimary,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
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
});
