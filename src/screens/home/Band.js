import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';

const BANDCAMP_ALBUM_ID = '1087783863';
const EMBED_URL = `https://bandcamp.com/EmbeddedPlayer/album=${BANDCAMP_ALBUM_ID}/size=large/bgcol=1E1B1F/linkcol=C9974A/tracklist=false/transparent=true/`;

export default function Band({ navigation }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Band" navigation={navigation} />
      <View style={styles.body}>
        <View style={styles.playerCard}>
          <WebView
            source={{ uri: EMBED_URL }}
            style={styles.webview}
            scrollEnabled={false}
          />
        </View>
        <Text style={styles.caption}>Powered by Bandcamp</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCard: {
    width: '100%',
    height: 400,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  caption: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
});
