import { Worm, Bomb, Spade, Grid2x2 } from 'lucide-react-native';
import Snake from './Snake';
import Minesweeper from './Minesweeper';
import Solitaire from './Solitaire';
import MemoryMatch from './MemoryMatch';

// Games registry — GameTray and GameWindow both read from this, in this
// fixed order. Adding a new game means adding one entry here plus its
// component file in this folder; nothing else needs to change.
export const GAMES = [
  { id: 'snake', label: 'Snake', Icon: Worm, Component: Snake },
  { id: 'minesweeper', label: 'Minesweeper', Icon: Bomb, Component: Minesweeper },
  { id: 'solitaire', label: 'Solitaire', Icon: Spade, Component: Solitaire },
  { id: 'memory-match', label: 'Memory Match', Icon: Grid2x2, Component: MemoryMatch },
];
