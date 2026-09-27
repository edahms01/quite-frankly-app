import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { GAMES } from '../../games';

// Pull-up tray for picking a game — opened from a video page or Home
// (Tasks 6/7). Purely a picker: selecting a tile hands the id back via
// onSelectGame and lets the caller decide what to do with it (open/reveal a
// GameWindow); GameTray has no opinion about the window itself.
export default function GameTray({ visible, onClose, onSelectGame }) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.heading}>Games</Text>
          <View style={styles.grid}>
            {GAMES.map(({ id, label, Icon }) => (
              <TouchableOpacity
                key={id}
                style={styles.tile}
                onPress={() => onSelectGame(id)}
                activeOpacity={0.7}
              >
                <Icon color={colors.inkPrimary} size={24} />
                <Text style={styles.tileLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
  },
  heading: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  tile: {
    width: '47%',
    backgroundColor: colors.surfaceGround,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tileLabel: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});
