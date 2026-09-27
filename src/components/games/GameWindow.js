import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { RotateCcw, X } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, shadows, spacing } from '../../theme';

export const WINDOW_WIDTH = 300;
export const WINDOW_HEADER_HEIGHT = 44;
export const WINDOW_GAME_HEIGHT = 320;
// total window height = WINDOW_HEADER_HEIGHT + WINDOW_GAME_HEIGHT = 364
const WINDOW_HEIGHT = WINDOW_HEADER_HEIGHT + WINDOW_GAME_HEIGHT;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Drag/position bounds the window's top-left corner may occupy so the whole
// window stays fully on screen (and, when avoidRect is present, fully below
// it) — reused for both the initial mount position and every drag update.
function getBounds(screenBounds, avoidRect) {
  const minLeft = 0;
  const maxLeft = Math.max(0, screenBounds.width - WINDOW_WIDTH);
  const minTop = avoidRect ? avoidRect.top + avoidRect.height : 0;
  const maxTop = Math.max(minTop, screenBounds.height - WINDOW_HEIGHT);
  return { minLeft, maxLeft, minTop, maxTop };
}

function getInitialPosition(screenBounds, avoidRect) {
  const bounds = getBounds(screenBounds, avoidRect);
  const left = Math.round((screenBounds.width - WINDOW_WIDTH) / 2);
  const top = avoidRect
    ? avoidRect.top + avoidRect.height + spacing.md
    : Math.round((screenBounds.height - WINDOW_HEIGHT) / 2);
  return {
    left: clamp(left, bounds.minLeft, bounds.maxLeft),
    top: clamp(top, bounds.minTop, bounds.maxTop),
  };
}

// Draggable floating window chrome, shared by every game. Games plug in via
// the `game` prop (an entry from GAMES) and never know about dragging,
// hiding, or restart — GameWindow owns all of that and just passes
// width/height/paused down.
export default function GameWindow({ game, screenBounds, avoidRect, hidden, onClose }) {
  const [position, setPosition] = useState(() => getInitialPosition(screenBounds, avoidRect));
  const [resetKey, setResetKey] = useState(0);
  const dragStartRef = useRef({ left: 0, top: 0 });

  const bounds = getBounds(screenBounds, avoidRect);
  // Re-clamp against *current* bounds every render, not just at mount/drag —
  // screenBounds can shrink after mount (e.g. MiniPlayer appearing), and
  // without this the window can end up overflowing its container. On
  // Android, touches outside a parent's laid-out bounds are dropped, so an
  // overflowing strip would also become untappable, not just visually off.
  const clampedLeft = clamp(position.left, bounds.minLeft, bounds.maxLeft);
  const clampedTop = clamp(position.top, bounds.minTop, bounds.maxTop);

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === State.BEGAN) {
      dragStartRef.current = { ...position };
    }
  };

  const onGestureEvent = (event) => {
    const { translationX, translationY } = event.nativeEvent;
    setPosition({
      left: clamp(dragStartRef.current.left + translationX, bounds.minLeft, bounds.maxLeft),
      top: clamp(dragStartRef.current.top + translationY, bounds.minTop, bounds.maxTop),
    });
  };

  const handleRestartPress = () => {
    Alert.alert('Restart game?', 'This clears your current progress.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restart', style: 'destructive', onPress: () => setResetKey((k) => k + 1) },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        { left: clampedLeft, top: clampedTop, width: WINDOW_WIDTH, height: WINDOW_HEIGHT },
        hidden && styles.hidden,
      ]}
      pointerEvents={hidden ? 'none' : 'auto'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.cornerZone} onPress={onClose} hitSlop={8}>
          <X color={colors.inkPrimary} size={20} />
        </TouchableOpacity>

        <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
          <View style={styles.dragZone}>
            <Text style={styles.title} numberOfLines={1}>{game.label}</Text>
          </View>
        </PanGestureHandler>

        <TouchableOpacity style={styles.cornerZone} onPress={handleRestartPress} hitSlop={8}>
          <RotateCcw color={colors.inkPrimary} size={20} />
        </TouchableOpacity>
      </View>

      <game.Component key={resetKey} width={WINDOW_WIDTH} height={WINDOW_GAME_HEIGHT} paused={hidden} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Floating above whatever the caller renders around it is the whole
    // point of this component — zIndex alone isn't reliable stacking
    // order on Android (paint order there follows elevation), so both are
    // set to the same value rather than relying on sibling JSX order.
    zIndex: 10,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    ...shadows.md,
    elevation: 10,
  },
  hidden: {
    opacity: 0,
  },
  header: {
    height: WINDOW_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGround,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLine,
  },
  cornerZone: {
    width: 56,
    height: WINDOW_HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragZone: {
    flex: 1,
    height: WINDOW_HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
});
