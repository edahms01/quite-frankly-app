import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import DestinationCard from '../../components/DestinationCard';
import GameWindow from '../../components/games/GameWindow';
import { GAMES } from '../../games';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { MINI_PLAYER_HEIGHT } from '../../components/MiniPlayer';

// Standalone Games screen (Home slot 9): the grid itself *is* the picker
// (no GameTray here — that's for interrupting a video page), so tapping a
// tile sets activeGame directly. `body` is flex: 1 below BackHeader, so its
// own onLayout gives the exact remaining on-screen area (already excluding
// both the header above and the bottom tab bar below, which this stack
// screen renders underneath per MainTabNavigator — no windowHeight minus a
// guessed/measured header-height arithmetic needed, and no risk of the
// window's drag bounds reaching down under the tab bar, though MiniPlayer's
// height still has to be subtracted separately since it overlays outside
// the navigator). No avoidRect (there's no video on this screen). `hidden`
// is driven by focus only (isFocused) — this screen has no fullscreen/
// orientation concept, but a Snake tick left running while blurred (e.g.
// switching tabs) is the same bug VideoPlayer.js has, so it needs the same
// useIsFocused fix.
export default function Games({ navigation }) {
  const [activeGame, setActiveGame] = useState(null);
  const [bodyLayout, setBodyLayout] = useState(null);
  const { currentTrack } = useAudioPlayer();
  const isFocused = useIsFocused();
  // MiniPlayer renders as an absolute overlay outside the navigator (see
  // App.js), docked above the tab bar, once a podcast track is loaded —
  // bodyLayout already excludes the tab bar itself but has no idea
  // MiniPlayer exists, so its height must be subtracted here too or the
  // window ends up underneath it.
  const miniPlayerHeight = currentTrack ? MINI_PLAYER_HEIGHT : 0;

  // A different tile than the one currently open silently discards
  // in-progress state — same confirmation GameWindow's own Restart uses.
  // Re-tapping the already-open game's own tile is a no-op, no confirmation.
  function handleSelectGame(game) {
    if (activeGame && activeGame.id !== game.id) {
      Alert.alert('Start a different game?', 'This clears your current progress.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', style: 'destructive', onPress: () => setActiveGame(game) },
      ]);
      return;
    }
    setActiveGame(game);
  }

  return (
    <View style={styles.container}>
      <BackHeader navigation={navigation} title="Games" />

      <View style={styles.body} onLayout={(e) => setBodyLayout(e.nativeEvent.layout)}>
        <View style={styles.grid}>
          {GAMES.map((game) => (
            <DestinationCard
              key={game.id}
              Icon={game.Icon}
              label={game.label}
              onPress={() => handleSelectGame(game)}
            />
          ))}
        </View>

        {activeGame && bodyLayout ? (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
            <GameWindow
              game={activeGame}
              screenBounds={{ width: bodyLayout.width, height: bodyLayout.height - miniPlayerHeight }}
              avoidRect={null}
              hidden={!isFocused}
              onClose={() => setActiveGame(null)}
            />
          </View>
        ) : null}
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
    padding: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
