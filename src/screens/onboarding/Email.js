import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mail } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme';
import OnboardingDots from '../../components/OnboardingDots';

export default function Email({ navigation }) {
  const [email, setEmail] = useState('');

  // Storage only — real code delivery/verification isn't wired yet,
  // Phase 4 will add it.
  const finishOnboarding = async () => {
    if (email.trim()) {
      await AsyncStorage.setItem('onboarding_email', email.trim());
    }
    navigation.navigate('MainTabs');
  };

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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.body}>
          Enter your email address and a one-time verification code will be
          sent to your email.
        </Text>
        <Text style={styles.sponsorNote}>
          Are you a Quite Frankly Sponsor? Use the same email you used for
          your subscription.
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
        <TouchableOpacity style={styles.skipLink} onPress={finishOnboarding}>
          <Text style={styles.skipLinkText}>Skip</Text>
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
  },
  sponsorNote: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regularItalic,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
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
  skipLink: {
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  skipLinkText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
});
