import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { activeOpacity, segButton, segButtonSelected, segText, segTextSelected, segTrack } from '../design/qf-presets';

// Generic 2-option toggle -- currently only Writing's Blog | Newsletter,
// but written for any 2-option case. Styled with the seg* presets from
// src/design/qf-presets.js (translucent track + hairline, gold selected,
// dark bold selected text); behaviour is unchanged.
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
            activeOpacity={activeOpacity}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // marginBottom / marginHorizontal are this screen's layout, not part of the preset.
  track: {
    ...segTrack,
    marginTop: 0,
    marginBottom: 14,
    marginHorizontal: 20,
  },
  pill: segButton,
  pillActive: segButtonSelected,
  label: segText,
  labelActive: segTextSelected,
});
