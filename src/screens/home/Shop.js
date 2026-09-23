import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../../theme';
import BackHeader from '../../components/BackHeader';
import DestinationCard from '../../components/DestinationCard';
import ExternalRow from '../../components/ExternalRow';

const STORES = [
  { label: 'Apparel', url: 'https://riseattireusa.com/intl/quitefrankly/' },
  { label: 'Coffee Revolution', url: 'https://www.coffeerevolution.shop/category/quite-frankly' },
  { label: 'Keto Brainz', url: 'https://ketobrainz.com/pages/quite-frankly-tv-podcast' },
  { label: 'Gold & Silver', url: 'https://quitefrankly.gold/' },
];

const AFFILIATES = [
  { title: 'Keto Brainz', subtitle: "15% off · Frank's coffee creamer", badge: 'FRANKLY', url: 'https://ketobrainz.com/pages/quite-frankly-tv-podcast' },
  { title: 'Farmalogical Bone Broth', subtitle: '15% off', badge: 'FRANKLY', url: 'https://farmalogical.com' },
  { title: 'Coffee Revolution', subtitle: 'QF Elevation Blend', badge: 'Free ship $50+', url: 'https://www.coffeerevolution.shop/category/quite-frankly' },
  { title: 'Patriot Protect', subtitle: '15% off · data removal service', badge: 'FRANKLY', url: 'http://patriot-protect.com/' },
  { title: 'Wise Wolf Gold & Silver', subtitle: 'Mention "Quite Frankly"', url: 'https://quitefrankly.gold' },
  { title: 'Blue Monster Prep', subtitle: 'Free shipping · emergency prep', badge: 'FRANKLY', url: 'https://bluemonsterprep.com' },
  { title: 'Pluck', subtitle: 'Superfood seasoning', badge: 'SUMMER', url: 'https://eatpluck.com/discount/SUMMER?redirect=%2Fproducts%2Fpluck-superfood-seasoning-master' },
  { title: 'Cultivate Elevate', subtitle: '10% off', badge: 'Frankly10', url: 'https://cultivateelevate.com/?ref=quitefrankly' },
  { title: 'Health Reclamation Project', subtitle: 'J Gulinello', url: 'https://www.HealthReclamationProject.com' },
  { title: 'YesCacao', subtitle: 'Ceremonial cacao', badge: 'FRANKLY', url: 'https://www.yescacao.com' },
  { title: 'Apex Water', subtitle: 'Mention "Victoria"', url: 'https://www.apex-water.com/frankly/' },
  { title: 'Flip City Magazine', subtitle: '10% off', badge: 'FRANKLY', url: 'https://flip-city-magazine.myshopify.com?rs_ref=4kksofoy' },
];

export default function Shop({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Shop" navigation={navigation} />
      <View style={styles.body}>
        <Text style={styles.sectionLabel}>SHOP</Text>
        <View style={styles.grid}>
          {STORES.map((s) => (
            <DestinationCard
              key={s.label}
              Icon={ShoppingBag}
              label={s.label}
              onPress={() => Linking.openURL(s.url)}
            />
          ))}
        </View>

        <Text style={[styles.sectionLabel, styles.affiliatesLabel]}>AFFILIATES</Text>
        <View style={styles.list}>
          {AFFILIATES.map((a) => (
            <ExternalRow
              key={a.title}
              title={a.title}
              subtitle={a.subtitle}
              badge={a.badge}
              url={a.url}
            />
          ))}
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
  sectionLabel: {
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    letterSpacing: 0.5,
  },
  affiliatesLabel: {
    marginTop: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
});
