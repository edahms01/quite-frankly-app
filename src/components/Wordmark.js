import { Image } from 'react-native';

// Native asset is 1720x404 (see CLAUDE.md) — height is derived from width
// here so every call site's aspect ratio can't drift out of sync with the
// real image.
export default function Wordmark({ width = 280, style }) {
  return (
    <Image
      source={require('../assets/images/quite-frankly-logo-final.png')}
      style={[{ width, height: width * (404 / 1720) }, style]}
      resizeMode="contain"
    />
  );
}
