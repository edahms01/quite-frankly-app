import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import Section from '../../components/Section';

const BANDCAMP_ALBUM_ID = '1087783863';
const EMBED_URL = `https://bandcamp.com/EmbeddedPlayer/album=${BANDCAMP_ALBUM_ID}/size=large/bgcol=1E1B1F/linkcol=C9974A/tracklist=false/transparent=true/`;

const SPOTIFY_PLAYLIST_ID = '1bpbozIzTEHbvtVRf8nyyI';
const SPOTIFY_PLAYLIST_URL = `https://open.spotify.com/playlist/${SPOTIFY_PLAYLIST_ID}`;
// Spotify's official iframe embed (theme=0 = dark). Logged-out viewers get
// 30s previews in the embed; the "Open in Spotify" button is the full-play path.
const SPOTIFY_EMBED_URL = `https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator&theme=0`;

export default function Music({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Music" navigation={navigation} />
      <View style={styles.body}>
        <Section title="QUITE FRANKLY SHOW PLAYLIST">
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

        <Section title="SET THE CHARGE">
          <View style={[styles.playerCard, styles.bandcampCard]}>
            <WebView
              source={{ uri: EMBED_URL }}
              style={styles.webview}
              scrollEnabled={false}
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
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  spotifyCard: {
    height: 152,
  },
  bandcampCard: {
    height: 400,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  linkButton: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  linkButtonText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  caption: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
