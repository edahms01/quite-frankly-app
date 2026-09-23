import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyRound } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme';
import OnboardingDots from '../../components/OnboardingDots';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const INITIAL_COOLDOWN_SECONDS = 60;

export default function CodeEntry({ navigation, route }) {
  const email = route.params?.email ?? '';
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | verifying | error
  const [errorMessage, setErrorMessage] = useState('');
  const [locked, setLocked] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(INITIAL_COOLDOWN_SECONDS);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const finishOnboarding = async (sessionToken) => {
    await AsyncStorage.setItem('onboarding_session_token', sessionToken);
    navigation.navigate('MainTabs');
  };

  const skipOnboarding = () => {
    navigation.navigate('MainTabs');
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    setStatus('verifying');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/.netlify/functions/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        if (data.reason === 'locked') {
          setLocked(true);
          setErrorMessage('Too many attempts. Resend a new code to try again.');
        } else if (data.reason === 'expired') {
          setErrorMessage('That code expired. Resend to get a new one.');
        } else {
          setErrorMessage(
            data.attemptsRemaining != null
              ? `Incorrect code. ${data.attemptsRemaining} attempts left.`
              : 'Incorrect code.'
          );
        }
        return;
      }

      setStatus('idle');
      await finishOnboarding(data.sessionToken);
    } catch (err) {
      setStatus('error');
      setErrorMessage("Couldn't verify that. Check your connection and try again.");
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || resending) return;
    setResending(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/.netlify/functions/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.retryAfterMs) {
          setCooldownSeconds(Math.ceil(data.retryAfterMs / 1000));
        }
        setErrorMessage('Hold on before requesting another code.');
        return;
      }

      setLocked(false);
      setStatus('idle');
      setCode('');
      setCooldownSeconds(Math.ceil((data.cooldownMs ?? INITIAL_COOLDOWN_SECONDS * 1000) / 1000));
    } catch (err) {
      setErrorMessage("Couldn't resend. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={skipOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <OnboardingDots total={4} activeIndex={3} />
        <View style={styles.iconCircle}>
          <KeyRound color={colors.accentGold} size={32} />
        </View>
        <Text style={styles.title}>Enter Your Code</Text>
        <Text style={styles.body}>
          We sent a 6-digit code to {email}. Enter it below to verify your account.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={colors.inkMuted}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />

        {status === 'error' ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.cta, (status === 'verifying' || locked) && styles.ctaDisabled]}
          onPress={handleVerify}
          disabled={status === 'verifying' || locked}
        >
          <Text style={styles.ctaText}>{status === 'verifying' ? 'Verifying…' : 'Verify'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={cooldownSeconds > 0 || resending}>
          <Text style={styles.resendText}>
            {cooldownSeconds > 0
              ? `Resend code in ${cooldownSeconds}s`
              : resending
                ? 'Resending…'
                : 'Resend code'}
          </Text>
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
    fontSize: fontSize.xxl,
    textAlign: 'center',
    letterSpacing: 8,
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
  resendText: {
    color: colors.accentGold,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    marginTop: spacing.md,
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
