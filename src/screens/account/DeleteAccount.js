import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import { deleteAccount } from '../../lib/account';

// In-app account deletion (App Store 5.1.1(v) / Google Play). Typed confirmation, plain explanation, an honest result. The same server function backs the public web
// page (netlify/public/delete-account.html). The device is cleared only when the server confirms, so a failure is simply retried.
const MESSAGES = {
  offline: "Couldn't reach the server. Check your connection and try again. Nothing was deleted.",
  rate_limited: 'Too many attempts. Please wait a while and try again. Nothing was deleted.',
  try_again: "Something went wrong and your account wasn't fully deleted. Please try again.",
};

export default function DeleteAccount({ navigation }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const confirmed = typed.trim() === 'DELETE';

  const onDelete = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    setMessage('');
    const result = await deleteAccount();      // on success this also resets navigation to the start of onboarding
    if (!result.ok) { setMessage(MESSAGES[result.reason] ?? MESSAGES.try_again); setBusy(false); }
  };

  return (
    <View style={styles.container}>
      <BackHeader title="Delete Account" navigation={navigation} hideAvatar />
      <View style={styles.body}>
        <Text style={styles.heading}>This permanently deletes your account.</Text>
        <Text style={styles.text}>
          We delete your email address, your sign-in sessions on all your devices, this device's notification registration, and your AskFrankie AI account and its saved
          questions. This can't be undone.
        </Text>
        <Text style={styles.text}>AskFrankie keeps a record with no email in it of how many questions you used this month, so deleting can't reset your monthly count.</Text>
        <Text style={styles.label}>Type DELETE to confirm</Text>
        <TextInput
          style={styles.input}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="DELETE"
          placeholderTextColor={colors.inkMuted}
          editable={!busy}
        />
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <TouchableOpacity style={[styles.button, (!confirmed || busy) && styles.buttonDisabled]} onPress={onDelete} disabled={!confirmed || busy}>
          {busy ? <ActivityIndicator color={colors.inkPrimary} /> : <Text style={styles.buttonText}>Delete my account</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceGround },
  body: { paddingHorizontal: spacing.md, gap: spacing.md },
  heading: { color: colors.inkPrimary, fontFamily: fontFamily.semiBold, fontSize: fontSize.xl },
  text: { color: colors.inkMuted, fontFamily: fontFamily.regular, fontSize: fontSize.md, lineHeight: 20 },
  label: { color: colors.inkPrimary, fontFamily: fontFamily.medium, fontSize: fontSize.md, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceLine,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.inkPrimary,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xl,
  },
  error: { color: colors.brandRed, fontFamily: fontFamily.medium, fontSize: fontSize.base },
  button: { backgroundColor: colors.brandRed, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.inkPrimary, fontFamily: fontFamily.semiBold, fontSize: fontSize.lg },
});
