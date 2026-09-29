import { Image } from 'react-native';

// Onboarding/boot wordmark ("QUITE FRANKLY TV", gold TV). Native asset is
// 1260x264 (downscaled from assets/wordmark - TV logo gold.png, 4160x872) —
// height is derived from width here so every call site's aspect ratio can't
// drift out of sync with the real image. Opaque #121014 bg baked in, same as
// colors.surfaceGround, so it's only safe on that background. Home/VideoPlayer
// headers still use quite-frankly-logo-final.png directly, not this component.
export default function Wordmark({ width = 280, style }) {
  return (
    <Image
      source={require('../assets/images/quite-frankly-tv-wordmark-gold.png')}
      style={[{ width, height: width * (264 / 1260) }, style]}
      resizeMode="contain"
    />
  );
}
