import { View } from 'react-native';

/**
 * Persistent mini-player stub. Real playback wiring (react-native-track-player,
 * visibility tied to playback state) is Phase 5 — empty View for now so the
 * mount point exists at the app-shell level, above the tab bar.
 */
export default function MiniPlayer() {
  return <View />;
}
