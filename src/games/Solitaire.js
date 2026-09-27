import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

// --- Pure game logic (kept separate from rendering, mirroring
// Minesweeper.js's structure) -------------------------------------------

const SUITS = ['S', 'H', 'D', 'C'];
const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS = new Set(['H', 'D']);
// Foundation piles are fixed to one suit each, in SUITS order — a
// deliberate simplification over "any empty foundation accepts any ace":
// it makes the 4 foundation slots unambiguous tap targets (each shows its
// suit symbol when empty) and makes the double-tap-to-foundation shortcut
// a trivial suit lookup rather than a search.
const DOUBLE_TAP_MS = 300;

function cardColor(suit) {
  return RED_SUITS.has(suit) ? 'red' : 'black';
}

function rankLabel(rank) {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffle(deck) {
  const arr = deck.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Deals a fresh Klondike layout: 7 tableau columns (1..7 cards, only the
// last face up), remaining 24 cards face-down in the stock.
function dealNewGame() {
  const deck = shuffle(buildDeck());
  let i = 0;
  const tableau = [];
  for (let col = 0; col < 7; col++) {
    const pile = [];
    for (let row = 0; row <= col; row++) {
      const card = deck[i++];
      pile.push({ ...card, faceUp: row === col });
    }
    tableau.push(pile);
  }
  const stock = deck.slice(i).map((c) => ({ ...c, faceUp: false }));
  return { tableau, foundations: [[], [], [], []], waste: [], stock };
}

function cloneGame(g) {
  return {
    tableau: g.tableau.map((col) => col.map((c) => ({ ...c }))),
    foundations: g.foundations.map((f) => f.map((c) => ({ ...c }))),
    waste: g.waste.map((c) => ({ ...c })),
    stock: g.stock.map((c) => ({ ...c })),
  };
}

// Draw-1 stock (simpler and more thumb-friendly than draw-3 at this
// window size). Tapping an empty stock recycles waste back into it,
// reversed so future draws replay in the original order.
function drawFromStock(g) {
  const next = cloneGame(g);
  if (next.stock.length === 0) {
    next.stock = next.waste.slice().reverse().map((c) => ({ ...c, faceUp: false }));
    next.waste = [];
  } else {
    const card = next.stock.pop();
    card.faceUp = true;
    next.waste.push(card);
  }
  return next;
}

function flipTableauTop(g, col) {
  const next = cloneGame(g);
  const pile = next.tableau[col];
  if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
    pile[pile.length - 1].faceUp = true;
  }
  return next;
}

// source: { type: 'tableau', col, idx } | { type: 'waste' }
function moveRunToTableau(g, source, destCol) {
  const next = cloneGame(g);
  let cards;
  if (source.type === 'tableau') {
    cards = next.tableau[source.col].splice(source.idx);
  } else {
    cards = [next.waste.pop()];
  }
  next.tableau[destCol].push(...cards);
  return next;
}

function moveCardToFoundation(g, source, suitIdx) {
  const next = cloneGame(g);
  const card = source.type === 'tableau' ? next.tableau[source.col].pop() : next.waste.pop();
  next.foundations[suitIdx].push(card);
  return next;
}

// A destination tableau pile accepts `card` if the pile is empty (Kings
// only) or `card` is one rank below the pile's exposed top card and the
// opposite color.
function canPlaceOnTableau(card, destPile) {
  if (destPile.length === 0) return card.rank === 13;
  const top = destPile[destPile.length - 1];
  if (!top.faceUp) return false;
  return cardColor(card.suit) !== cardColor(top.suit) && card.rank === top.rank - 1;
}

function canPlaceOnFoundation(card, foundationPile, suitIdx) {
  if (card.suit !== SUITS[suitIdx]) return false;
  if (foundationPile.length === 0) return card.rank === 1;
  const top = foundationPile[foundationPile.length - 1];
  return card.rank === top.rank + 1;
}

// Whether pile[idx..end] is a legally-stacked, movable run (each card one
// rank below and opposite color from the one above it).
function isValidRun(pile, idx) {
  for (let i = idx; i < pile.length - 1; i++) {
    const a = pile[i];
    const b = pile[i + 1];
    if (!a.faceUp || !b.faceUp) return false;
    if (cardColor(a.suit) === cardColor(b.suit)) return false;
    if (a.rank !== b.rank + 1) return false;
  }
  return true;
}

function getSelectedCards(game, selection) {
  if (!selection) return [];
  if (selection.type === 'waste') {
    const card = game.waste[game.waste.length - 1];
    return card ? [card] : [];
  }
  return game.tableau[selection.col].slice(selection.idx);
}

// --- Rendering ------------------------------------------------------------

const RED_TEXT = '#B33A3A';
const BLACK_TEXT = '#201C1E';
const CARD_BACK = colors.brandRed;

function CardFace({ card, faceDown, selected, width, height }) {
  const size = { width, height };
  // faceDown is checked first: a face-down back renders the same way
  // whether or not real card data was passed (the stock pile's back
  // never passes `card` at all, since its identity should stay hidden).
  if (faceDown) {
    return <View style={[cardStyles.face, cardStyles.back, size]} />;
  }
  if (!card) {
    return <View style={[cardStyles.slot, size]} />;
  }
  const color = cardColor(card.suit) === 'red' ? RED_TEXT : BLACK_TEXT;
  return (
    <View style={[cardStyles.face, cardStyles.up, size, selected && cardStyles.selected]}>
      <Text style={[cardStyles.rank, { color }]}>{rankLabel(card.rank)}</Text>
      <Text style={[cardStyles.suit, { color }]}>{SUIT_SYMBOLS[card.suit]}</Text>
    </View>
  );
}

// Games registry contract: default export, signature exactly
// ({ width, height, paused }) — see global-constraints.md.
export default function Solitaire({ width, height, paused }) {
  const [game, setGame] = useState(() => dealNewGame());
  const [selection, setSelection] = useState(null); // { type: 'tableau', col, idx } | { type: 'waste' } | null
  const [status, setStatus] = useState('playing'); // 'playing' | 'won'
  const lastTapRef = useRef({ key: null, time: 0 });

  useEffect(() => {
    const total = game.foundations.reduce((sum, f) => sum + f.length, 0);
    if (total === 52) setStatus('won');
  }, [game.foundations]);

  // --- Layout math, derived from the props GameWindow hands us. Card
  // stacking offset is clamped per-column so an unusually long tableau
  // pile (built up mid-game) compresses instead of overflowing the
  // fixed height given to us — no internal scrolling per the contract.
  const COLUMN_GAP = 2;
  const COLUMN_WIDTH = Math.floor(width / 7);
  const CARD_WIDTH = COLUMN_WIDTH - COLUMN_GAP * 2;
  const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.4);
  const STATUS_HEIGHT = 18;
  const SECTION_GAP = 6;
  const TOP_ROW_HEIGHT = CARD_HEIGHT;
  // container has its own paddingTop (spacing.xs) which eats into `height`
  // just like STATUS_HEIGHT/TOP_ROW_HEIGHT/SECTION_GAP do — omitting it let
  // the deepest tableau card run a few pixels past the bottom, clipped by
  // GameWindow's overflow: hidden.
  const CONTAINER_PADDING_TOP = spacing.xs;
  const TABLEAU_AREA_HEIGHT = Math.max(
    60,
    height - STATUS_HEIGHT - TOP_ROW_HEIGHT - SECTION_GAP * 2 - CONTAINER_PADDING_TOP
  );
  const BASE_OFFSET = 16;

  function stackOffset(count) {
    if (count <= 1) return 0;
    return Math.min(BASE_OFFSET, (TABLEAU_AREA_HEIGHT - CARD_HEIGHT) / (count - 1));
  }

  function isDoubleTap(key) {
    const now = Date.now();
    const was = lastTapRef.current.key === key && now - lastTapRef.current.time < DOUBLE_TAP_MS;
    lastTapRef.current = { key, time: now };
    return was;
  }

  function handleStockPress() {
    if (paused || status !== 'playing') return;
    setGame((g) => drawFromStock(g));
    setSelection(null);
  }

  function handleWastePress() {
    if (paused || status !== 'playing') return;
    const card = game.waste[game.waste.length - 1];
    if (!card) return;
    const double = isDoubleTap('waste');
    if (double) {
      const suitIdx = SUITS.indexOf(card.suit);
      if (canPlaceOnFoundation(card, game.foundations[suitIdx], suitIdx)) {
        setGame((g) => moveCardToFoundation(g, { type: 'waste' }, suitIdx));
        setSelection(null);
        return;
      }
    }
    if (selection && selection.type === 'waste') {
      setSelection(null);
      return;
    }
    setSelection({ type: 'waste' });
  }

  function handleFoundationPress(suitIdx) {
    if (paused || status !== 'playing') return;
    if (!selection) return;
    const selCards = getSelectedCards(game, selection);
    if (selCards.length !== 1) return;
    const card = selCards[0];
    if (canPlaceOnFoundation(card, game.foundations[suitIdx], suitIdx)) {
      setGame((g) => moveCardToFoundation(g, selection, suitIdx));
      setSelection(null);
    }
  }

  // Tap on empty tableau space (an empty column, or below a column's
  // cards) — the "tap a destination pile" half of the interaction model.
  function handleColumnBackgroundPress(col) {
    if (paused || status !== 'playing') return;
    if (!selection) return;
    if (selection.type === 'tableau' && selection.col === col) return;
    const pile = game.tableau[col];
    const selCards = getSelectedCards(game, selection);
    if (selCards.length === 0) return;
    if (canPlaceOnTableau(selCards[0], pile)) {
      setGame((g) => moveRunToTableau(g, selection, col));
      setSelection(null);
    }
  }

  function handleTableauCardPress(col, idx) {
    if (paused || status !== 'playing') return;
    const pile = game.tableau[col];
    const card = pile[idx];
    if (!card) return;
    const isTop = idx === pile.length - 1;
    const double = isDoubleTap(`t-${col}-${idx}`);

    if (!card.faceUp) {
      if (isTop) {
        setGame((g) => flipTableauTop(g, col));
        setSelection(null);
      }
      return;
    }

    if (double && isTop) {
      const suitIdx = SUITS.indexOf(card.suit);
      if (canPlaceOnFoundation(card, game.foundations[suitIdx], suitIdx)) {
        setGame((g) => moveCardToFoundation(g, { type: 'tableau', col }, suitIdx));
        setSelection(null);
        return;
      }
    }

    // Tapping the exact card that's already selected deselects it.
    if (selection && selection.type === 'tableau' && selection.col === col && selection.idx === idx) {
      setSelection(null);
      return;
    }

    // A selection exists targeting a different column — treat this tap
    // as "tap a destination pile" and attempt the move.
    if (selection && !(selection.type === 'tableau' && selection.col === col)) {
      const selCards = getSelectedCards(game, selection);
      if (selCards.length > 0 && canPlaceOnTableau(selCards[0], pile)) {
        setGame((g) => moveRunToTableau(g, selection, col));
        setSelection(null);
        return;
      }
      // Illegal as a destination — fall through and treat this card as a
      // freshly chosen source instead, rather than leaving the tap dead.
    }

    if (isValidRun(pile, idx) || isTop) {
      setSelection({ type: 'tableau', col, idx });
    } else {
      setSelection(null);
    }
  }

  function isCardSelected(col, idx) {
    return !!selection && selection.type === 'tableau' && selection.col === col && idx >= selection.idx;
  }

  const foundationCount = game.foundations.reduce((sum, f) => sum + f.length, 0);
  const statusText = status === 'won' ? 'You Win!' : `Foundations: ${foundationCount}/52`;

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={[styles.statusBar, { height: STATUS_HEIGHT }]}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      <View style={[styles.topRow, { height: TOP_ROW_HEIGHT, marginTop: SECTION_GAP }]}>
        {/* Stock */}
        <TouchableOpacity
          style={[styles.slotWrap, { width: COLUMN_WIDTH }]}
          activeOpacity={0.7}
          onPress={handleStockPress}
        >
          {game.stock.length > 0 ? (
            <CardFace faceDown width={CARD_WIDTH} height={CARD_HEIGHT} />
          ) : (
            <View style={[cardStyles.slot, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
              <Text style={styles.recycleGlyph}>{'↺'}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Waste */}
        <TouchableOpacity
          style={[styles.slotWrap, { width: COLUMN_WIDTH }]}
          activeOpacity={0.7}
          onPress={handleWastePress}
        >
          <CardFace
            card={game.waste[game.waste.length - 1]}
            selected={!!selection && selection.type === 'waste'}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
          />
        </TouchableOpacity>

        {/* Spacer */}
        <View style={[styles.slotWrap, { width: COLUMN_WIDTH }]} />

        {/* Foundations */}
        {SUITS.map((suit, suitIdx) => {
          const pile = game.foundations[suitIdx];
          const top = pile[pile.length - 1];
          return (
            <TouchableOpacity
              key={suit}
              style={[styles.slotWrap, { width: COLUMN_WIDTH }]}
              activeOpacity={0.7}
              onPress={() => handleFoundationPress(suitIdx)}
            >
              {top ? (
                <CardFace card={top} width={CARD_WIDTH} height={CARD_HEIGHT} />
              ) : (
                <View style={[cardStyles.slot, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
                  <Text style={[styles.foundationGlyph, cardColor(suit) === 'red' && styles.foundationGlyphRed]}>
                    {SUIT_SYMBOLS[suit]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.tableauRow, { height: TABLEAU_AREA_HEIGHT, marginTop: SECTION_GAP }]}>
        {game.tableau.map((pile, col) => {
          const offset = stackOffset(pile.length);
          return (
            <TouchableOpacity
              key={col}
              style={[styles.columnWrap, { width: COLUMN_WIDTH, height: TABLEAU_AREA_HEIGHT }]}
              activeOpacity={1}
              onPress={() => handleColumnBackgroundPress(col)}
            >
              {pile.map((card, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cardAbs,
                    {
                      top: idx * offset,
                      left: (COLUMN_WIDTH - CARD_WIDTH) / 2,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleTableauCardPress(col, idx)}
                >
                  <CardFace
                    card={card}
                    faceDown={!card.faceUp}
                    selected={card.faceUp && isCardSelected(col, idx)}
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                  />
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  statusBar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
  topRow: {
    flexDirection: 'row',
  },
  tableauRow: {
    flexDirection: 'row',
  },
  slotWrap: {
    alignItems: 'center',
  },
  columnWrap: {
    position: 'relative',
  },
  cardAbs: {
    position: 'absolute',
  },
  recycleGlyph: {
    color: colors.inkMuted,
    fontSize: fontSize.lg,
  },
  foundationGlyph: {
    color: colors.surfaceLine,
    fontSize: fontSize.xl,
  },
  foundationGlyphRed: {
    color: colors.surfaceLine,
  },
});

const cardStyles = StyleSheet.create({
  face: {
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  slot: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceLine,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    backgroundColor: CARD_BACK,
    borderColor: colors.surfaceLine,
  },
  up: {
    backgroundColor: colors.inkPrimary,
    borderColor: colors.surfaceLine,
    paddingTop: 2,
    paddingLeft: 3,
  },
  selected: {
    borderColor: colors.accentGold,
    borderWidth: 2,
  },
  rank: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm + 1,
  },
  suit: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm + 1,
  },
});
