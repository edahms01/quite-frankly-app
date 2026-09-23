import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FileText, Mail } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import DestinationCard from '../../components/DestinationCard';

export default function Writing({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Writing" navigation={navigation} />
      <View style={styles.body}>
        <View style={styles.grid}>
          <DestinationCard
            Icon={FileText}
            label="Blog"
            onPress={() => Linking.openURL('https://www.quitefrankly.tv/blog')}
          />
          <DestinationCard
            Icon={Mail}
            label="Newsletter Archive"
            onPress={() => Linking.openURL('https://www.quitefrankly.tv/newsletter-archives')}
          />
        </View>

        <View style={styles.soonRow}>
          <Text style={styles.soonText}>Guest Appearances</Text>
          <View style={styles.soonBadge}>
            <Text style={styles.soonBadgeText}>SOON</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  soonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.surfaceLine,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  soonText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  soonBadge: {
    borderWidth: 1,
    borderColor: colors.surfaceLine,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  soonBadgeText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
});
