import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mail } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme';
import OnboardingDots from '../../components/OnboardingDots';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export default function Email({ navigation }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const skipOnboarding = async () => {
    if (email.trim()) {
      await AsyncStorage.setItem('onboarding_email', email.trim());
    }
    navigation.navigate('MainTabs');
  };

  const handleContinue = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Enter an email address to continue.');
      return;
    }

    setSending(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/.netlify/functions/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!response.ok) {
        throw new Error('Send failed');
      }

      await AsyncStorage.setItem('onboarding_email', trimmedEmail);
      setSending(false);
      navigation.navigate('CodeEntry', { email: trimmedEmail });
    } catch (err) {
      setSending(false);
      setErrorMessage("Couldn't send a code. Check your connection and try again.");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={skipOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <OnboardingDots total={4} activeIndex={2} />
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
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <TouchableOpacity
          style={[styles.cta, sending && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color={colors.inkPrimary} />
          ) : (
            <Text style={styles.ctaText}>Continue</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipLink} onPress={skipOnboarding}>
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
  errorText: {
    color: colors.brandRed,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  cta: {
    backgroundColor: colors.brandRed,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.6,
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
