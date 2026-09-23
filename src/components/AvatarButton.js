import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, fontFamily, fontSize } from '../theme';

// Placeholder initial until real account/profile data exists.
export default function AvatarButton({ onPress, initial = 'E' }) {
  return (
    <TouchableOpacity style={styles.avatar} onPress={onPress}>
      <Text style={styles.initial}>{initial}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
});
