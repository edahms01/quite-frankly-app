import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize } from '../theme';

// Stub only — real Memory Match game logic lands in Task 5. Keep this
// trivially small; GameWindow remounts it via a changing `key` on confirmed
// Restart, so it must not build any reset logic of its own.
export default function MemoryMatch({ width, height, paused }) {
  return (
    <View style={[styles.container, { width, height }]}>
      <Text style={styles.text}>Memory Match — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.inkMuted,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
  },
});
