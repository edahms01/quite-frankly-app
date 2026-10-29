import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { button, buttonText } from '../../design/qf-presets';
import BackHeader from '../../components/BackHeader';
import Section from '../../components/Section';
import { allowBandcampNavigation, BANDCAMP_EMBED_HEIGHT, BANDCAMP_EMBED_URL } from '../../lib/bandcampEmbed';

const SPOTIFY_PLAYLIST_ID = '1bpbozIzTEHbvtVRf8nyyI';
const SPOTIFY_PLAYLIST_URL = `https://open.spotify.com/playlist/${SPOTIFY_PLAYLIST_ID}`;
// Spotify's official iframe embed (theme=0 = dark). Logged-out viewers get
// 30s previews in the embed; the "Open in Spotify" button is the full-play path.
const SPOTIFY_EMBED_URL = `https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator&theme=0`;

export default function Music({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Jam" navigation={navigation} />
      <View style={styles.body}>
        <Section title="Quite Frankly Show Playlist">
          <View style={[styles.playerCard, styles.spotifyCard]}>
            <WebView
              source={{ uri: SPOTIFY_EMBED_URL }}
              style={styles.webview}
              nestedScrollEnabled
            />
          </View>
          <Text style={styles.caption}>Previews only here. Open in Spotify for full songs.</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL(SPOTIFY_PLAYLIST_URL)}
          >
            <Text style={styles.linkButtonText}>Open in Spotify</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Set the Charge">
          <View style={[styles.playerCard, styles.bandcampCard]}>
            <WebView
              source={{ uri: BANDCAMP_EMBED_URL }}
              style={styles.webview}
              scrollEnabled={false}
              // the player's title and "bc" mark link to the album (store) page: only the player itself may load
              onShouldStartLoadWithRequest={(request) => allowBandcampNavigation(request.url)}
              setSupportMultipleWindows={false}
            />
          </View>
          <Text style={styles.caption}>Powered by Bandcamp</Text>
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
  playerCard: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  spotifyCard: {
    height: 152,
  },
  bandcampCard: {
    height: BANDCAMP_EMBED_HEIGHT,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  linkButton: button,
  linkButtonText: buttonText,
  caption: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
