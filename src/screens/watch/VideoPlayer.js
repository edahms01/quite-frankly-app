import { useEffect, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Share } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { relativeTime } from '../../utils/relativeTime';
import VideoEmbed from '../../components/VideoEmbed';
import VideoThumbnailOverlay from '../../components/VideoThumbnailOverlay';
import BackHeader from '../../components/BackHeader';
import VideoTypePill from '../../components/VideoTypePill';
import { useVideoActiveSource } from '../../hooks/useVideoActiveSource';

// Matches Home.js's mostRecentCard video area, and playerArea's own height
// below — kept as one constant so VideoEmbed's explicit numeric height
// prop can't drift out of sync with the box it's rendered inside.
const PLAYER_HEIGHT = 220;

export default function VideoPlayer({ navigation, route }) {
  const video = route?.params?.video;
  const title = video?.title ?? '[Video title]';
  const youtubeUrl = video?.id
    ? `https://www.youtube.com/watch?v=${video.id}`
    : 'https://www.youtube.com/channel/UCtB5nbKHYsX8EGIk9cOevaQ';
  const { width: windowWidth } = useWindowDimensions();
  // Arriving on this screen is itself the "play" action (matches today's
  // behavior, where the embed loads immediately on mount) — a podcast
  // starting stops it back to a tap-to-resume thumbnail.
  const [embedVisible, setEmbedVisible] = useState(true);
  const { claim } = useVideoActiveSource({ onForcedStop: () => setEmbedVisible(false) });

  useEffect(() => {
    claim();
  }, [claim]);

  return (
    <ScrollView style={styles.container}>
      <BackHeader
        navigation={navigation}
        titleElement={
          <Image
            source={require('../../assets/images/quite-frankly-logo-final.png')}
            style={styles.wordmark}
            resizeMode="contain"
          />
        }
      />

      <View style={styles.playerArea}>
        {embedVisible ? (
          <VideoEmbed videoId={video.id} width={windowWidth} height={PLAYER_HEIGHT} />
        ) : (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={0.85}
            onPress={() => {
              claim();
              setEmbedVisible(true);
            }}
          >
            <VideoThumbnailOverlay thumbnailUrl={video?.thumbnailUrl} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {video?.publishedAt ? (
          <Text style={styles.meta}>Quite Frankly · {relativeTime(video.publishedAt)}</Text>
        ) : null}

        <View style={styles.actionsRow}>
          <VideoTypePill
            type={video?.contentType}
            style={styles.typePill}
            textStyle={styles.typePillText}
          />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(youtubeUrl)}
          >
            <Text style={styles.actionText}>Watch on YouTube</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Share.share({ message: title, url: youtubeUrl })}
          >
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.sponsorButton}
          onPress={() => navigation.navigate('AccountStack', { screen: 'Subscription' })}
        >
          <Text style={styles.sponsorButtonText}>Become a Sponsor</Text>
        </TouchableOpacity>

        {video?.description ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.description}>{video.description}</Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  wordmark: {
    width: 172,
    height: 40,
  },
  // Matches Home.js's sponsorButton exactly (full-width, gold-bordered,
  // centered label) for visual consistency across screens.
  sponsorButton: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  sponsorButtonText: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  playerArea: {
    height: PLAYER_HEIGHT,
    backgroundColor: '#000',
  },
  body: {
    padding: spacing.md,
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
  },
  meta: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  // Matches actionButton/actionText's box+text size exactly, so the pill
  // reads as the same size as "Watch on YouTube"/"Share" next to it.
  // borderRadius overrides the base pill's radius.sm — deliberately more
  // rounded than actionButton's own radius.md, so it still reads as a
  // pill/label next to the real buttons, not a third button.
  typePill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  typePillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceLine,
    marginVertical: spacing.md,
  },
  description: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
});
