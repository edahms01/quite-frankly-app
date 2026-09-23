import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';

export default function SubscriptionConfirmed({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <CircleCheck color={colors.accentGold} size={40} />
      </View>
      <Text style={styles.title}>You're in!</Text>
      <Text style={styles.subtitle}>You should receive an email confirmation shortly.</Text>

      <TouchableOpacity
        style={styles.cta}
        onPress={() => navigation.navigate('MainTabs')}
      >
        <Text style={styles.ctaText}>Back to QF App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
  },
  subtitle: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  cta: {
    backgroundColor: colors.brandRed,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ctaText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
  },
});
