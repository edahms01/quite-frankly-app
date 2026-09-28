import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';

// Generic 2-option toggle -- currently only Writing's Blog | Newsletter,
// but written for any 2-option case. Exact spec (colors/sizes/margins)
// supplied directly from the wireframe boards, not derived from theme.js
// tokens -- kept as literal pixel values here to match that spec exactly,
// same as this component's one consumer needs pixel-perfect parity with
// the design.
export default function SegmentedControl({ options, value, onChange }) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onChange(option.key)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: 999,
    padding: 3,
    marginTop: 0,
    marginBottom: 14,
    marginHorizontal: 20,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillActive: {
    backgroundColor: colors.accentGold,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  labelActive: {
    color: '#121014',
    fontWeight: '700',
  },
});
