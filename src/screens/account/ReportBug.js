import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ImagePlus } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';

export default function ReportBug({ navigation }) {
  const [description, setDescription] = useState('');

  // Backend wiring (Netlify function writing to SHEET-BUGS) is Phase 4 —
  // submit is disabled until then rather than silently doing nothing.
  return (
    <ScrollView style={styles.container}>
      <BackHeader title="Report a Bug" navigation={navigation} />
      <View style={styles.body}>
        <Text style={styles.blurb}>
          This form is fan-run, not Frank's own support line — reports
          help us fix the app, not the show.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Describe what happened..."
          placeholderTextColor={colors.inkMuted}
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity style={styles.attachRow}>
          <ImagePlus color={colors.inkMuted} size={18} />
          <Text style={styles.attachText}>Attach a screenshot (optional)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitButton} disabled>
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  blurb: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  input: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.inkPrimary,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  attachText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
  submitButton: {
    backgroundColor: colors.brandRed,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
  },
});
