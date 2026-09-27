import { StyleSheet, TouchableOpacity } from 'react-native';
import { User } from 'lucide-react-native';
import { colors } from '../theme';

export default function AvatarButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.avatar} onPress={onPress}>
      <User color={colors.inkPrimary} size={18} />
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
});
