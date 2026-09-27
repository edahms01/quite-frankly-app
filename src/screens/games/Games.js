import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import DestinationCard from '../../components/DestinationCard';
import GameWindow from '../../components/games/GameWindow';
import { GAMES } from '../../games';

// Standalone Games screen (Home slot 9): the grid itself *is* the picker
// (no GameTray here — that's for interrupting a video page), so tapping a
// tile sets activeGame directly. `body` is flex: 1 below BackHeader, so its
// own onLayout gives the exact remaining on-screen area (already excluding
// both the header above and the bottom tab bar below, which this stack
// screen renders underneath per MainTabNavigator — no windowHeight minus a
// guessed/measured header-height arithmetic needed, and no risk of the
// window's drag bounds reaching down under the tab bar). No avoidRect
// (there's no video on this screen) and hidden is always false — this
// screen has nothing that needs to pause/hide the window.
export default function Games({ navigation }) {
  const [activeGame, setActiveGame] = useState(null);
  const [bodyLayout, setBodyLayout] = useState(null);

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
              onPress={() => setActiveGame(game)}
            />
          ))}
        </View>

        {activeGame && bodyLayout ? (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
            <GameWindow
              game={activeGame}
              screenBounds={{ width: bodyLayout.width, height: bodyLayout.height }}
              avoidRect={null}
              hidden={false}
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
