import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { PhoneCall, Voicemail } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import Section from '../../components/Section';
import DestinationCard from '../../components/DestinationCard';
import CopyBadge from '../../components/CopyBadge';

// E.164 with the +1 country code: dials as a normal domestic call for US
// callers (the + prefix is just the carrier-agnostic form of "1" + area code)
// and works for international callers too.
const CALL_IN_NUMBER = '+19142000269';
const CALL_IN_DISPLAY = '+1-914-200-0269';
const VOICEMAIL_URL = 'https://www.speakpipe.com/QuiteFrankly';

// Devices with no Phone app (iPad, simulator) don't reject openURL for tel:
// — it resolves and nothing happens (confirmed on the iOS Simulator) — so
// check canOpenURL first and fall back to showing the number.
const callIn = async () => {
  const url = `tel:${CALL_IN_NUMBER}`;
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return;
    }
  } catch {}
  Alert.alert('Call-In Live', `Dial ${CALL_IN_DISPLAY} from a phone.`);
};

// For callers who'd rather dial from another app (WhatsApp, Google Voice…).
const copyNumber = async () => {
  await Clipboard.setStringAsync(CALL_IN_DISPLAY);
  Alert.alert('Copied', 'Call-In number copied to clipboard.');
};

export default function PhoneLines({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Phone Lines" navigation={navigation} />
      <View style={styles.body}>
        <Section title="REACH THE SHOW">
          <View style={styles.intro}>
            <Text style={styles.introText}>Want to call from another app?</Text>
            <TouchableOpacity style={styles.numberRow} onPress={copyNumber}>
              <Text style={styles.numberValue}>{CALL_IN_DISPLAY}</Text>
              <CopyBadge />
            </TouchableOpacity>
          </View>
          <View style={styles.grid}>
            <DestinationCard Icon={PhoneCall} label="Call-In Live" onPress={callIn} />
            <DestinationCard
              Icon={Voicemail}
              label="Leave a Voicemail"
              onPress={() => WebBrowser.openBrowserAsync(VOICEMAIL_URL, { dismissButtonStyle: 'close' })}
            />
          </View>
        </Section>
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
    gap: spacing.xl,
  },
  // Plain intro text under the section label (no card): a muted sentence,
  // then the number with the standard Copy badge inline beside it.
  // One line on most phones; flexWrap drops the number + Copy to a second
  // line on narrow screens instead of overflowing.
  intro: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.sm,
    rowGap: spacing.sm,
  },
  introText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  numberValue: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  // Same 2-up wrapping grid as Community/Home (DestinationCard default 47%).
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
