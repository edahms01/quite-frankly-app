import { Text, TouchableOpacity } from 'react-native';
import { activeOpacity, buttonGold, buttonGoldText } from '../design/qf-presets';

// The one "Support the Show" button (gold outline). Home, Watch, Listen and
// VideoPlayer each used to define their own copy of these styles. The label is
// fixed; pass `onPress`, and `style` only for contextual spacing (VideoPlayer's
// marginTop).
export default function SponsorButton({ onPress, style }) {
  return (
    <TouchableOpacity style={[buttonGold, style]} onPress={onPress} activeOpacity={activeOpacity}>
      <Text style={buttonGoldText}>Support the Show</Text>
    </TouchableOpacity>
  );
}
