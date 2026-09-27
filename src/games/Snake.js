import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

// Layout constants. CELL_SIZE picked in the ~16-20px range called out in
// the brief; cols/rows are derived from the actual width/height props (see
// useMemo below) rather than hardcoded, so this still works if GameWindow
// or a future caller ever passes a different size.
const CELL_SIZE = 16;
const STATUS_HEIGHT = 28;
const DPAD_AREA_HEIGHT = 116;
const TICK_MS = 150;
const INITIAL_LENGTH = 3;

const DIRECTIONS = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 },
};

function isOpposite(a, b) {
  return a.dx === -b.dx && a.dy === -b.dy;
}

function makeInitialSnake(cols, rows) {
  const startY = Math.floor(rows / 2);
  const startX = Math.max(Math.floor(cols / 2), INITIAL_LENGTH - 1);
  const snake = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    snake.push({ x: startX - i, y: startY });
  }
  return snake;
}

function spawnFood(snake, cols, rows) {
  const occupied = new Set(snake.map((seg) => `${seg.x},${seg.y}`));
  const free = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

// Games registry contract: default export, signature exactly
// ({ width, height, paused }) — see global-constraints.md.
export default function Snake({ width, height, paused }) {
  // Board sizing is computed once at mount from the props GameWindow hands
  // us; the component never resets itself internally (only a parent-driven
  // remount via a changing `key` does), so there's no need to react to
  // width/height changing after mount.
  const { cols, rows, boardWidth, boardHeight } = useMemo(() => {
    const availableHeight = Math.max(height - STATUS_HEIGHT - DPAD_AREA_HEIGHT, CELL_SIZE * 5);
    const c = Math.max(5, Math.floor(width / CELL_SIZE));
    const r = Math.max(5, Math.floor(availableHeight / CELL_SIZE));
    return { cols: c, rows: r, boardWidth: c * CELL_SIZE, boardHeight: r * CELL_SIZE };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [snake, setSnake] = useState(() => makeInitialSnake(cols, rows));
  const [food, setFood] = useState(() => spawnFood(makeInitialSnake(cols, rows), cols, rows));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const directionRef = useRef(DIRECTIONS.RIGHT);
  const nextDirectionRef = useRef(DIRECTIONS.RIGHT);
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const gameOverRef = useRef(gameOver);

  snakeRef.current = snake;
  foodRef.current = food;
  gameOverRef.current = gameOver;

  useEffect(() => {
    if (paused || gameOver) return undefined;

    const interval = setInterval(() => {
      const currentSnake = snakeRef.current;
      const currentFood = foodRef.current;

      directionRef.current = nextDirectionRef.current;
      const dir = directionRef.current;
      const head = currentSnake[0];
      const newHead = { x: head.x + dir.dx, y: head.y + dir.dy };

      if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
        setGameOver(true);
        return;
      }

      const ateFood = currentFood && newHead.x === currentFood.x && newHead.y === currentFood.y;
      // Self-collision: a snake moving into its own body. The current tail
      // cell is about to vacate unless we're growing, so it doesn't count
      // as an obstacle in that case.
      const bodyToCheck = ateFood ? currentSnake : currentSnake.slice(0, -1);
      const hitSelf = bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y);
      if (hitSelf) {
        setGameOver(true);
        return;
      }

      const newSnake = [newHead, ...currentSnake];
      if (!ateFood) {
        newSnake.pop();
      } else {
        setScore((s) => s + 1);
        setFood(spawnFood(newSnake, cols, rows));
      }
      setSnake(newSnake);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [paused, gameOver, cols, rows]);

  function handleDirectionPress(newDir) {
    if (paused || gameOverRef.current) return;
    if (isOpposite(newDir, directionRef.current)) return;
    nextDirectionRef.current = newDir;
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {gameOver ? `Game Over — Score: ${score}` : `Score: ${score}`}
        </Text>
      </View>

      <View style={styles.boardArea}>
        <View style={[styles.board, { width: boardWidth, height: boardHeight }]}>
          {food ? (
            <View
              style={[
                styles.food,
                { left: food.x * CELL_SIZE, top: food.y * CELL_SIZE },
              ]}
            />
          ) : null}
          {snake.map((seg, i) => (
            <View
              key={`${seg.x}-${seg.y}-${i}`}
              style={[
                styles.snakeSegment,
                i === 0 && styles.snakeHead,
                { left: seg.x * CELL_SIZE, top: seg.y * CELL_SIZE },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.dpad}>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity
            style={styles.dpadButton}
            onPress={() => handleDirectionPress(DIRECTIONS.UP)}
            activeOpacity={0.7}
          >
            <ArrowUp color={colors.inkPrimary} size={20} />
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
        </View>
        <View style={styles.dpadRow}>
          <TouchableOpacity
            style={styles.dpadButton}
            onPress={() => handleDirectionPress(DIRECTIONS.LEFT)}
            activeOpacity={0.7}
          >
            <ArrowLeft color={colors.inkPrimary} size={20} />
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity
            style={styles.dpadButton}
            onPress={() => handleDirectionPress(DIRECTIONS.RIGHT)}
            activeOpacity={0.7}
          >
            <ArrowRight color={colors.inkPrimary} size={20} />
          </TouchableOpacity>
        </View>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity
            style={styles.dpadButton}
            onPress={() => handleDirectionPress(DIRECTIONS.DOWN)}
            activeOpacity={0.7}
          >
            <ArrowDown color={colors.inkPrimary} size={20} />
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
        </View>
      </View>
    </View>
  );
}

const DPAD_BUTTON_SIZE = 36;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
  },
  statusBar: {
    height: STATUS_HEIGHT,
    justifyContent: 'center',
  },
  statusText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    backgroundColor: colors.surfaceGround,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  snakeSegment: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#4C9A5A',
  },
  snakeHead: {
    backgroundColor: '#7ED9A0',
  },
  food: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#D9634F',
    borderRadius: CELL_SIZE / 2,
  },
  dpad: {
    height: DPAD_AREA_HEIGHT,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dpadRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dpadSpacer: {
    width: DPAD_BUTTON_SIZE,
    height: DPAD_BUTTON_SIZE,
  },
  dpadButton: {
    width: DPAD_BUTTON_SIZE,
    height: DPAD_BUTTON_SIZE,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceGround,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
