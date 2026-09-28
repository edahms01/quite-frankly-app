import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Share } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { colors, fontFamily, fontSize, radius, shadows, spacing } from '../../theme';
import { relativeTime } from '../../utils/relativeTime';
import VideoEmbed from '../../components/VideoEmbed';
import VideoThumbnailOverlay from '../../components/VideoThumbnailOverlay';
import BackHeader from '../../components/BackHeader';
import VideoTypePill from '../../components/VideoTypePill';
import { useVideoActiveSource } from '../../hooks/useVideoActiveSource';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { MINI_PLAYER_HEIGHT } from '../../components/MiniPlayer';
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
  const { currentTrack } = useAudioPlayer();
  const isFocused = useIsFocused();

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
  // The ScrollView's own visible height — the screen sits above the tab
  // bar, so windowHeight alone would let the window be dragged down
  // underneath it. Falls back to windowHeight until measured.
  const [viewportHeight, setViewportHeight] = useState(null);
  // MiniPlayer renders as an absolute overlay outside the navigator (see
  // App.js), docked above the tab bar, once a podcast track is loaded —
  // viewportHeight already excludes the tab bar itself but has no idea
  // MiniPlayer exists, so its height must be subtracted here too or the
  // window/FAB end up underneath it.
  const miniPlayerHeight = currentTrack ? MINI_PLAYER_HEIGHT : 0;
  // Only drives the window's *bottom* clamp. The game layer's *top* is not
  // derived from this (or any) React state — see gameAnchor below.
  const gameLayerHeight = (viewportHeight ?? windowHeight) - headerHeight - miniPlayerHeight;
  const isLandscape = windowWidth > windowHeight;
  // On iPad, orientation alone shouldn't hide the window — the anchored/
  // clamped game layer already guarantees no video overlap regardless of
  // orientation, and hiding it there with no way back to portrait (no FAB,
  // no visible window) is a dead end. Only phones are orientation-locked to
  // portrait (app.json/AndroidManifest), so this only matters on iPad.
  const hidden = (Platform.isPad ? false : isLandscape) || isFullscreen;

  const handleSelectGame = (id) => {
    const game = GAMES.find((g) => g.id === id);
    // Bring the video (and the window anchored just below it) into view;
    // scrolling is then locked while a game is open.
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setActiveGame(game);
    setTrayVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        scrollEnabled={!activeGame}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
      >
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

        {/* gameAnchor: the game layer is an absolute child of this wrapper,
            whose top edge IS playerArea's top edge. Yoga positions the layer
            in the same native layout pass that positions the video, so when
            the header's height changes (e.g. status-bar inset shrinking/
            growing across a fullscreen transition), the layer moves with
            the video in the same frame — there's no React-state round trip
            that could leave it one render behind. Combined with
            GameWindow's top clamp at avoidRect.height (= PLAYER_HEIGHT, a
            constant), the window can never sit above the video's bottom
            edge, regardless of event ordering. Scroll offset is irrelevant
            too: the layer scrolls with the video. minHeight keeps the
            wrapper tall enough that the whole layer stays inside its
            parent's bounds (Android only delivers touches within them). */}
        <View style={activeGame ? { minHeight: gameLayerHeight } : null}>
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

          <View
            style={[styles.body, activeGame && styles.bodyHidden]}
            pointerEvents={activeGame ? 'none' : 'auto'}
          >
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

          {activeGame ? (
            // Layout frame only, box-none so this transparent container never
            // intercepts touches on the video (or the page) — only GameWindow
            // itself is touchable.
            <View pointerEvents="box-none" style={[styles.gameLayer, { height: gameLayerHeight }]}>
              <GameWindow
                game={activeGame}
                screenBounds={{ width: windowWidth, height: gameLayerHeight }}
                avoidRect={{ top: 0, left: 0, width: windowWidth, height: PLAYER_HEIGHT }}
                hidden={hidden || !isFocused}
                onClose={() => setActiveGame(null)}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Hidden while a game is open: the window now lives inside the
          ScrollView, so this later sibling would paint over it wherever
          they overlap. The window's own Close is the way out. */}
      {activeGame ? null : (
        <TouchableOpacity
          style={[styles.fab, miniPlayerHeight ? { bottom: spacing.md + miniPlayerHeight } : null]}
          activeOpacity={0.85}
          onPress={() => setTrayVisible(true)}
          accessibilityLabel="Play a game"
        >
          <Gamepad2 color={colors.surfaceGround} size={26} />
        </TouchableOpacity>
      )}

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
    top: 0,
    left: 0,
    right: 0,
  },
  bodyHidden: {
    opacity: 0,
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
