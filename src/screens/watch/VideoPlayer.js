import { useEffect, useRef, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Share } from 'react-native';
import { colors, fontFamily, fontSize, radius, shadows, spacing } from '../../theme';
import { relativeTime } from '../../utils/relativeTime';
import VideoEmbed from '../../components/VideoEmbed';
import VideoThumbnailOverlay from '../../components/VideoThumbnailOverlay';
import BackHeader from '../../components/BackHeader';
import VideoTypePill from '../../components/VideoTypePill';
import { useVideoActiveSource } from '../../hooks/useVideoActiveSource';
import { Gamepad2 } from 'lucide-react-native';
import GameTray from '../../components/games/GameTray';
import GameWindow from '../../components/games/GameWindow';
import { GAMES } from '../../games';

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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // Arriving on this screen is itself the "play" action (matches today's
  // behavior, where the embed loads immediately on mount) — a podcast
  // starting stops it back to a tap-to-resume thumbnail.
  const [embedVisible, setEmbedVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Unmounting the embed means no fullscreen:exit message will ever arrive,
  // so clear the flag here too — otherwise a game window could stay hidden.
  const { claim } = useVideoActiveSource({
    onForcedStop: () => {
      setEmbedVisible(false);
      setIsFullscreen(false);
    },
  });

  useEffect(() => {
    claim();
  }, [claim]);

  // Games: activeGame is a GAMES entry (or null). Once set, GameWindow stays
  // mounted until the user taps its own Close — landscape/fullscreen only
  // flip `hidden` (which pauses + hides it without unmounting), so game
  // state survives those transitions.
  const scrollViewRef = useRef(null);
  const [activeGame, setActiveGame] = useState(null);
  const [trayVisible, setTrayVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  // The game layer's real measured height — the screen sits above the tab
  // bar, so windowHeight - headerHeight alone would let the window be
  // dragged down underneath it. Falls back to that estimate until measured.
  const [gameLayerHeight, setGameLayerHeight] = useState(null);
  const isLandscape = windowWidth > windowHeight;
  const hidden = isLandscape || isFullscreen;

  const handleSelectGame = (id) => {
    const game = GAMES.find((g) => g.id === id);
    // The window's avoid zone assumes the video sits right under the
    // header (scroll offset 0); scrolling is then locked while it's open.
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setActiveGame(game);
    setTrayVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollViewRef} style={styles.container} scrollEnabled={!activeGame}>
        <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
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
        </View>

        <View style={styles.playerArea}>
          {embedVisible ? (
            <VideoEmbed
              videoId={video.id}
              width={windowWidth}
              height={PLAYER_HEIGHT}
              onFullscreenChange={setIsFullscreen}
            />
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

      {activeGame ? (
        // Layout frame only: starts exactly where playerArea starts, and
        // box-none so this transparent container never intercepts touches
        // on the video (or the page) — only GameWindow itself is touchable.
        // GameWindow clamps its top to below avoidRect (the video banner),
        // so the window itself can never overlap the player.
        <View
          pointerEvents="box-none"
          style={[styles.gameLayer, { top: headerHeight }]}
          onLayout={(e) => setGameLayerHeight(e.nativeEvent.layout.height)}
        >
          <GameWindow
            game={activeGame}
            screenBounds={{
              width: windowWidth,
              height: gameLayerHeight ?? windowHeight - headerHeight,
            }}
            avoidRect={{ top: 0, left: 0, width: windowWidth, height: PLAYER_HEIGHT }}
            hidden={hidden}
            onClose={() => setActiveGame(null)}
          />
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setTrayVisible(true)}
        accessibilityLabel="Play a game"
      >
        <Gamepad2 color={colors.surfaceGround} size={26} />
      </TouchableOpacity>

      <GameTray
        visible={trayVisible}
        onClose={() => setTrayVisible(false)}
        onSelectGame={handleSelectGame}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  gameLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    elevation: 6,
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
