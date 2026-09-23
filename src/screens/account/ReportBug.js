import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, CircleCheck } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import BackHeader from '../../components/BackHeader';
import appConfig from '../../../app.json';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export default function ReportBug({ navigation }) {
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [errorMessage, setErrorMessage] = useState('');

  const pickScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to attach a screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.5,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setScreenshot({
      base64: asset.base64,
      mimeType: asset.mimeType || 'image/jpeg',
    });
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setStatus('error');
      setErrorMessage('Describe what happened before submitting.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/.netlify/functions/report-bug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          screenshotBase64: screenshot?.base64,
          screenshotMimeType: screenshot?.mimeType,
          deviceInfo: `${Platform.OS} ${Platform.Version} / Quite Frankly ${appConfig.expo.version}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Submit failed');
      }

      setStatus('idle');
      setDescription('');
      setScreenshot(null);
      Alert.alert('Thanks', "Your report's in — we'll take a look.");
    } catch (err) {
      setStatus('error');
      setErrorMessage("Couldn't send that. Check your connection and try again.");
    }
  };

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

        <TouchableOpacity style={styles.attachRow} onPress={pickScreenshot}>
          {screenshot ? (
            <CircleCheck color={colors.accentGold} size={18} />
          ) : (
            <ImagePlus color={colors.inkMuted} size={18} />
          )}
          <Text style={styles.attachText}>
            {screenshot ? 'Screenshot attached' : 'Attach a screenshot (optional)'}
          </Text>
        </TouchableOpacity>

        {status === 'error' ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.submitButton, status === 'submitting' && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? (
            <ActivityIndicator color={colors.inkPrimary} />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
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
  errorText: {
    color: colors.brandRed,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
  submitButton: {
    backgroundColor: colors.brandRed,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
  },
});
