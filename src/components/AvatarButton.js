import { StyleSheet, TouchableOpacity } from 'react-native';
import { Settings, User } from 'lucide-react-native';
import { colors, spacing } from '../theme';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { accountEntry } from '../lib/featureFlags';

// Opens the account area: the avatar with accounts on, a gear ("Settings") with accounts off.
export default function AvatarButton({ onPress }) {
  const entry = accountEntry(useFeatureFlags());
  const Icon = entry.icon === 'gear' ? Settings : User;
  return (
    <TouchableOpacity style={styles.avatar} onPress={onPress} hitSlop={spacing.xs} accessibilityLabel={entry.title}>
      <Icon color={colors.inkPrimary} size={18} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgRaised2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
