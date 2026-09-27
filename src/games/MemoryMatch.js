import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Cloud, Gem, Heart, Moon, Music, Star, Sun, Zap } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

// Layout constants. 4x4 = 16 cards / 8 pairs comfortably fills GameWindow's
// 300x320 area (see cardSize useMemo below, which derives actual pixel size
// from the width/height props rather than hardcoding it).
const GRID_COLS = 4;
const GRID_ROWS = 4;
const PAIR_COUNT = (GRID_COLS * GRID_ROWS) / 2;
const CARD_GAP = spacing.xs;
const STATUS_HEIGHT = 28;
// How long a non-matching pair stays face-up before flipping back down.
const MISMATCH_DELAY_MS = 700;

// One icon + restrained color per pair face. Small hardcoded per-game
// palette, matching the precedent set by Minesweeper's NUMBER_COLORS.
const SYMBOLS = [
  { Icon: Heart, color: '#E07A7A' },
  { Icon: Star, color: colors.accentGold },
  { Icon: Sun, color: '#D9A066' },
  { Icon: Moon, color: '#B39DDB' },
  { Icon: Cloud, color: '#6FA8DC' },
  { Icon: Zap, color: '#E8D44D' },
  { Icon: Music, color: '#7FD1C3' },
  { Icon: Gem, color: '#8FCB84' },
];

// Builds a freshly shuffled 16-card deck (8 symbol indices, each twice),
// via Fisher-Yates. Called once per mount (and again whenever GameWindow
// remounts this component via a changing `key` on confirmed Restart).
function shuffledDeck() {
  const symbolIndices = [];
  for (let i = 0; i < PAIR_COUNT; i++) {
    symbolIndices.push(i, i);
  }
  for (let i = symbolIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [symbolIndices[i], symbolIndices[j]] = [symbolIndices[j], symbolIndices[i]];
  }
  return symbolIndices.map((symbolIndex, id) => ({
    id,
    symbolIndex,
    flipped: false,
    matched: false,
  }));
}

// Games registry contract: default export, signature exactly
// ({ width, height, paused }) — see global-constraints.md.
export default function MemoryMatch({ width, height, paused }) {
  const [cards, setCards] = useState(() => shuffledDeck());
  // Index of the single face-up, unresolved card while waiting for a second
  // tap. Empty once a pair has been resolved (matched or flipped back).
  const [pendingIndex, setPendingIndex] = useState(null);
  // True while a mismatched pair is being shown before its flip-back delay
  // fires — blocks new taps during that window.
  const [locked, setLocked] = useState(false);
  const [status, setStatus] = useState('playing'); // 'playing' | 'won'
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const { cardSize, boardSize } = useMemo(() => {
    const availableHeight = height - STATUS_HEIGHT;
    const boardMax = Math.min(width, availableHeight);
    const size = Math.floor((boardMax - CARD_GAP * (GRID_COLS + 1)) / GRID_COLS);
    return { cardSize: size, boardSize: size * GRID_COLS + CARD_GAP * (GRID_COLS + 1) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePress(index) {
    if (paused || locked || status !== 'playing') return;
    const card = cards[index];
    if (card.flipped || card.matched) return;

    if (pendingIndex === null) {
      setCards((prev) => prev.map((c, i) => (i === index ? { ...c, flipped: true } : c)));
      setPendingIndex(index);
      return;
    }

    const firstIndex = pendingIndex;
    const flippedCards = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));

    if (flippedCards[firstIndex].symbolIndex === flippedCards[index].symbolIndex) {
      const matchedCards = flippedCards.map((c, i) =>
        i === firstIndex || i === index ? { ...c, matched: true } : c
      );
      setCards(matchedCards);
      setPendingIndex(null);
      if (matchedCards.every((c) => c.matched)) {
        setStatus('won');
      }
    } else {
      setCards(flippedCards);
      setLocked(true);
      setPendingIndex(null);
      timeoutRef.current = setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) => (i === firstIndex || i === index ? { ...c, flipped: false } : c))
        );
        setLocked(false);
      }, MISMATCH_DELAY_MS);
    }
  }

  const matchedPairs = cards.filter((c) => c.matched).length / 2;
  const statusText = status === 'won' ? 'You Win!' : `Pairs: ${matchedPairs}/${PAIR_COUNT}`;

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      <View style={styles.boardArea}>
        <View style={[styles.board, { width: boardSize, height: boardSize, padding: CARD_GAP }]}>
          {Array.from({ length: GRID_ROWS }).map((_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({ length: GRID_COLS }).map((_, col) => {
                const index = row * GRID_COLS + col;
                const card = cards[index];
                const faceUp = card.flipped || card.matched;
                const Symbol = SYMBOLS[card.symbolIndex].Icon;
                const symbolColor = SYMBOLS[card.symbolIndex].color;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.card,
                      {
                        width: cardSize,
                        height: cardSize,
                        margin: CARD_GAP / 2,
                      },
                      faceUp ? styles.cardFaceUp : styles.cardFaceDown,
                      card.matched && styles.cardMatched,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handlePress(index)}
                  >
                    {faceUp ? <Symbol color={symbolColor} size={Math.round(cardSize * 0.5)} /> : null}
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
  },
  row: {
    flexDirection: 'row',
  },
  card: {
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFaceDown: {
    backgroundColor: colors.surfaceLine,
  },
  cardFaceUp: {
    backgroundColor: colors.surfaceCard,
  },
  cardMatched: {
    borderWidth: 1,
    borderColor: colors.accentGold,
  },
});
