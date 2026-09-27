import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bomb, Flag } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius } from '../theme';

// Layout constants. CELL_SIZE picked so a board fits comfortably in
// GameWindow's 300x320 area (~9x9 cells); cols/rows are derived from the
// actual width/height props (see useMemo below), not hardcoded, so this
// still works if GameWindow or a future caller ever passes a different size.
const CELL_SIZE = 32;
const STATUS_HEIGHT = 28;
// Mine density: a restrained middle ground between classic beginner (9x9/10
// mines, ~12%) and intermediate (~16-20%) difficulty.
const MINE_DENSITY = 0.14;

// Small hardcoded palette for adjacent-mine-count numbers — the classic
// convention loosely adapted to read against a dark board.
const NUMBER_COLORS = {
  1: '#6FA8DC',
  2: '#8FCB84',
  3: '#E07A7A',
  4: '#B39DDB',
  5: '#D9A066',
  6: '#7FD1C3',
  7: colors.inkPrimary,
  8: colors.inkMuted,
};

function makeEmptyGrid(cols, rows) {
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      row.push({ mine: false, revealed: false, flagged: false, adjacent: 0 });
    }
    grid.push(row);
  }
  return grid;
}

function forEachNeighbor(x, y, cols, rows, fn) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) fn(nx, ny);
    }
  }
}

// Places mines avoiding the given safe cell and its immediate neighbors
// (first-tap-safe, per the brief), then computes adjacency counts.
function placeMines(grid, cols, rows, mineCount, safeX, safeY) {
  const safe = new Set([`${safeX},${safeY}`]);
  forEachNeighbor(safeX, safeY, cols, rows, (nx, ny) => safe.add(`${nx},${ny}`));

  const candidates = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!safe.has(`${x},${y}`)) candidates.push({ x, y });
    }
  }
  // Shuffle and take the first mineCount candidates.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const placed = candidates.slice(0, Math.min(mineCount, candidates.length));
  placed.forEach(({ x, y }) => {
    grid[y][x].mine = true;
  });

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x].mine) continue;
      let count = 0;
      forEachNeighbor(x, y, cols, rows, (nx, ny) => {
        if (grid[ny][nx].mine) count++;
      });
      grid[y][x].adjacent = count;
    }
  }
}

// Flood-fills connected zero-adjacent cells outward from (x, y), mutating
// grid in place. Standard BFS via an explicit stack.
function floodReveal(grid, cols, rows, x, y) {
  const stack = [{ x, y }];
  while (stack.length > 0) {
    const { x: cx, y: cy } = stack.pop();
    const cell = grid[cy][cx];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.mine) {
      forEachNeighbor(cx, cy, cols, rows, (nx, ny) => {
        const n = grid[ny][nx];
        if (!n.revealed && !n.flagged && !n.mine) stack.push({ x: nx, y: ny });
      });
    }
  }
}

function countRevealed(grid) {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.revealed) count++;
    }
  }
  return count;
}

// Games registry contract: default export, signature exactly
// ({ width, height, paused }) — see global-constraints.md.
export default function Minesweeper({ width, height, paused }) {
  // Board sizing is computed once at mount from the props GameWindow hands
  // us; the component never resets itself internally (only a parent-driven
  // remount via a changing `key` does), so there's no need to react to
  // width/height changing after mount.
  const { cols, rows, boardWidth, boardHeight, mineCount } = useMemo(() => {
    const availableHeight = Math.max(height - STATUS_HEIGHT, CELL_SIZE * 5);
    const c = Math.max(5, Math.floor(width / CELL_SIZE));
    const r = Math.max(5, Math.floor(availableHeight / CELL_SIZE));
    const mines = Math.max(8, Math.round(c * r * MINE_DENSITY));
    return { cols: c, rows: r, boardWidth: c * CELL_SIZE, boardHeight: r * CELL_SIZE, mineCount: mines };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [grid, setGrid] = useState(() => makeEmptyGrid(cols, rows));
  const [status, setStatus] = useState('playing'); // 'playing' | 'won' | 'lost'
  const minesPlacedRef = useRef(false);

  function revealAllMines(g) {
    for (const row of g) {
      for (const cell of row) {
        if (cell.mine) cell.revealed = true;
      }
    }
  }

  function handlePress(x, y) {
    if (paused || status !== 'playing') return;
    const current = grid[y][x];
    if (current.revealed || current.flagged) return;

    // Work on a shallow-cloned grid so React sees a new reference; cell
    // objects inside are mutated in place by placeMines/floodReveal, mirroring
    // Snake's ref-driven mutation pattern for the parts that don't need to
    // trigger their own re-render.
    const next = grid.map((row) => row.map((cell) => ({ ...cell })));

    if (!minesPlacedRef.current) {
      placeMines(next, cols, rows, mineCount, x, y);
      minesPlacedRef.current = true;
    }

    const tapped = next[y][x];
    if (tapped.mine) {
      tapped.revealed = true;
      revealAllMines(next);
      setGrid(next);
      setStatus('lost');
      return;
    }

    floodReveal(next, cols, rows, x, y);
    setGrid(next);

    const revealedCount = countRevealed(next);
    if (revealedCount >= cols * rows - mineCount) {
      setStatus('won');
    }
  }

  function handleLongPress(x, y) {
    if (paused || status !== 'playing') return;
    const current = grid[y][x];
    if (current.revealed) return;

    const next = grid.map((row) => row.map((cell) => ({ ...cell })));
    next[y][x].flagged = !next[y][x].flagged;
    setGrid(next);
  }

  const flagCount = useMemo(() => {
    let count = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell.flagged) count++;
      }
    }
    return count;
  }, [grid]);

  const minesRemaining = mineCount - flagCount;

  let statusText;
  if (status === 'lost') statusText = 'Game Over';
  else if (status === 'won') statusText = 'You Win!';
  else statusText = `Mines: ${minesRemaining}`;

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      <View style={styles.boardArea}>
        <View style={[styles.board, { width: boardWidth, height: boardHeight }]}>
          {grid.map((row, y) => (
            <View key={y} style={styles.row}>
              {row.map((cell, x) => {
                const showMine = cell.revealed && cell.mine;
                const showNumber = cell.revealed && !cell.mine && cell.adjacent > 0;
                return (
                  <TouchableOpacity
                    key={x}
                    style={[
                      styles.cell,
                      cell.revealed ? styles.cellRevealed : styles.cellHidden,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handlePress(x, y)}
                    onLongPress={() => handleLongPress(x, y)}
                    delayLongPress={350}
                  >
                    {showMine ? (
                      <Bomb color={colors.brandRed} size={16} />
                    ) : showNumber ? (
                      <Text style={[styles.cellText, { color: NUMBER_COLORS[cell.adjacent] }]}>
                        {cell.adjacent}
                      </Text>
                    ) : cell.flagged ? (
                      <Flag color={colors.accentGold} size={14} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

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
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.surfaceGround,
  },
  cellHidden: {
    backgroundColor: colors.surfaceLine,
  },
  cellRevealed: {
    backgroundColor: colors.surfaceCard,
  },
  cellText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
  },
});
